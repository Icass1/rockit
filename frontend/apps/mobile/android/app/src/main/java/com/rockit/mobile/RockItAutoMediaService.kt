package com.rockit.mobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.os.Bundle
import android.support.v4.media.MediaBrowserCompat
import android.support.v4.media.MediaDescriptionCompat
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.media.MediaBrowserServiceCompat
import androidx.media.app.NotificationCompat as MediaNotificationCompat
import androidx.media.session.MediaButtonReceiver
import java.net.URL
import java.util.concurrent.Executors

class RockItAutoMediaService : MediaBrowserServiceCompat() {

    private lateinit var mediaSession: MediaSessionCompat
    private val notificationManager by lazy {
        getSystemService(NOTIFICATION_SERVICE) as NotificationManager
    }
    private val audioManager by lazy {
        getSystemService(AUDIO_SERVICE) as AudioManager
    }
    private val executor = Executors.newSingleThreadExecutor()
    private var currentArtwork: Bitmap? = null
    private var lastArtworkUrl: String? = null

    @Volatile
    private var isForeground = false

    // Set once the user hits the notification's Stop action (or the last
    // task is removed while paused). Guards against a late, in-flight
    // MediaStateManager change (e.g. the JS round-trip from safeEmit("stop"))
    // resurrecting the notification while the service is tearing down.
    @Volatile
    private var isStopped = false

    @Volatile
    private var lastRouteNudgeAt = 0L

    private val stateChangeListener: () -> Unit = { updateSession() }

    // Some Bluetooth car stereos silently drop the audio stream mid-track
    // without ever tearing down the A2DP *profile* connection (so
    // BluetoothConnectionReceiver's connect/disconnect broadcast never
    // fires), then self-heal on their own. When that happens, AudioManager
    // often still observes the Bluetooth output device being removed and
    // re-added at the routing layer even though the profile stayed
    // connected throughout. Watching for that and nudging playback is a
    // best-effort recovery for a case we otherwise have no signal for.
    private val audioDeviceCallback = object : AudioDeviceCallback() {
        override fun onAudioDevicesAdded(addedDevices: Array<AudioDeviceInfo>) {
            handlePossibleRouteRecovery(addedDevices)
        }
    }

    private fun handlePossibleRouteRecovery(devices: Array<AudioDeviceInfo>) {
        try {
            if (!MediaStateManager.isPlaying) return
            val isBluetoothOutput = devices.any {
                it.isSink &&
                    (it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
                        it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO)
            }
            if (!isBluetoothOutput) return

            val now = System.currentTimeMillis()
            if (now - lastRouteNudgeAt < ROUTE_NUDGE_DEBOUNCE_MS) return
            lastRouteNudgeAt = now

            RockItMediaModule.emitEvent("audioRouteChanged", null)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to handle audio route change", e)
        }
    }

    companion object {
        private const val TAG = "RockItAutoMediaService"
        private const val ROOT_ID = "root"
        private const val QUEUE_ID = "queue"
        private const val ROUTE_NUDGE_DEBOUNCE_MS = 5_000L
        const val CHANNEL_ID = "rockit_playback"
        const val NOTIFICATION_ID = 42
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()

        mediaSession = MediaSessionCompat(this, "RockItAuto").apply {
            setCallback(SessionCallback())
            setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS or
                MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS or
                MediaSessionCompat.FLAG_HANDLES_QUEUE_COMMANDS
            )
            isActive = true
        }
        sessionToken = mediaSession.sessionToken

        MediaStateManager.addChangeListener(stateChangeListener)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            audioManager.registerAudioDeviceCallback(audioDeviceCallback, null)
        }
        updateSession()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        MediaButtonReceiver.handleIntent(mediaSession, intent)
        return START_NOT_STICKY
    }

    // The service is only ever started when playback begins (see
    // RockItMediaModule.startMediaService) and previously had no way to stop
    // itself: swiping the app from recents doesn't kill a foreground
    // service's process, so playback (and the notification) would run
    // forever with no stop control once the app was closed. Tapping the
    // notification's Stop action, or removing the app while already paused,
    // now tears the service down.
    private fun stopPlaybackAndService() {
        if (isStopped) return
        isStopped = true
        MediaStateManager.isPlaying = false
        mediaSession.isActive = false
        stopForeground(true)
        isForeground = false
        stopSelf()
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
        if (!MediaStateManager.isPlaying) {
            stopPlaybackAndService()
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Media Playback",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Music playback controls"
                setShowBadge(false)
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun applyMetadata() {
        val builder = MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, MediaStateManager.title)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, MediaStateManager.artist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, MediaStateManager.album)
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, MediaStateManager.duration)
        MediaStateManager.artworkUrl?.let {
            builder.putString(MediaMetadataCompat.METADATA_KEY_ART_URI, it)
            builder.putString(MediaMetadataCompat.METADATA_KEY_ALBUM_ART_URI, it)
        }
        currentArtwork?.let {
            builder.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, it)
            builder.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, it)
        }
        mediaSession.setMetadata(builder.build())
    }

    // Wrapped defensively: this runs on every MediaStateManager change (including
    // ones triggered directly by OS/Bluetooth transport controls), so an
    // unexpected exception here would otherwise crash the whole app process.
    private fun updateSession() {
        try {
            updateSessionInternal()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update media session", e)
        }
    }

    private fun updateSessionInternal() {
        applyMetadata()

        val stateCode = if (MediaStateManager.isPlaying)
            PlaybackStateCompat.STATE_PLAYING
        else
            PlaybackStateCompat.STATE_PAUSED

        val playbackState = PlaybackStateCompat.Builder()
            .setState(stateCode, MediaStateManager.position, if (MediaStateManager.isPlaying) 1f else 0f)
            .setActions(
                PlaybackStateCompat.ACTION_PLAY or
                PlaybackStateCompat.ACTION_PAUSE or
                PlaybackStateCompat.ACTION_PLAY_PAUSE or
                PlaybackStateCompat.ACTION_SKIP_TO_NEXT or
                PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS or
                PlaybackStateCompat.ACTION_SEEK_TO or
                PlaybackStateCompat.ACTION_SKIP_TO_QUEUE_ITEM or
                PlaybackStateCompat.ACTION_STOP
            )
            .build()
        mediaSession.setPlaybackState(playbackState)

        val queueItems = MediaStateManager.queue.mapIndexed { index, item ->
            val desc = MediaDescriptionCompat.Builder()
                .setMediaId(item.mediaId)
                .setTitle(item.title)
                .setSubtitle(item.artist)
                .build()
            MediaSessionCompat.QueueItem(desc, index.toLong())
        }
        mediaSession.setQueue(queueItems)
        if (MediaStateManager.queue.isNotEmpty()) {
            mediaSession.setQueueTitle("Queue")
        }

        val artworkUrl = MediaStateManager.artworkUrl
        if (artworkUrl != lastArtworkUrl) {
            lastArtworkUrl = artworkUrl
            if (artworkUrl != null) {
                executor.submit {
                    try {
                        currentArtwork = BitmapFactory.decodeStream(URL(artworkUrl).openStream())
                    } catch (_: Exception) {
                        currentArtwork = null
                    }
                    try {
                        applyMetadata()
                        postNotification()
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to apply artwork metadata", e)
                    }
                }
            } else {
                currentArtwork = null
                applyMetadata()
                postNotification()
            }
        } else {
            postNotification()
        }
    }

    private fun postNotification() {
        if (isStopped) return
        if (MediaStateManager.title.isEmpty()) return

        val notification = buildNotification()
        if (!isForeground) {
            startForeground(NOTIFICATION_ID, notification)
            isForeground = true
        } else {
            notificationManager.notify(NOTIFICATION_ID, notification)
        }
    }

    private fun buildNotification(): Notification {
        val isPlaying = MediaStateManager.isPlaying

        val openAppIntent = packageManager.getLaunchIntentForPackage(packageName)?.let {
            PendingIntent.getActivity(
                this, 0, it,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        val prevIntent = MediaButtonReceiver.buildMediaButtonPendingIntent(
            this, PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
        )
        val playPauseIntent = MediaButtonReceiver.buildMediaButtonPendingIntent(
            this, PlaybackStateCompat.ACTION_PLAY_PAUSE
        )
        val nextIntent = MediaButtonReceiver.buildMediaButtonPendingIntent(
            this, PlaybackStateCompat.ACTION_SKIP_TO_NEXT
        )
        val stopIntent = MediaButtonReceiver.buildMediaButtonPendingIntent(
            this, PlaybackStateCompat.ACTION_STOP
        )

        val playPauseIcon = if (isPlaying)
            android.R.drawable.ic_media_pause
        else
            android.R.drawable.ic_media_play

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(MediaStateManager.title)
            .setContentText(MediaStateManager.artist.ifEmpty { null })
            .setSmallIcon(R.mipmap.ic_launcher)
            .setLargeIcon(currentArtwork)
            .setContentIntent(openAppIntent)
            .setStyle(
                MediaNotificationCompat.MediaStyle()
                    .setMediaSession(mediaSession.sessionToken)
                    .setShowActionsInCompactView(0, 1, 2)
            )
            .addAction(android.R.drawable.ic_media_previous, "Previous", prevIntent)
            .addAction(playPauseIcon, if (isPlaying) "Pause" else "Play", playPauseIntent)
            .addAction(android.R.drawable.ic_media_next, "Next", nextIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Stop", stopIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)
            .build()
    }

    override fun onGetRoot(
        clientPackageName: String,
        clientUid: Int,
        rootHints: Bundle?
    ): BrowserRoot = BrowserRoot(ROOT_ID, null)

    override fun onLoadChildren(
        parentId: String,
        result: Result<MutableList<MediaBrowserCompat.MediaItem>>
    ) {
        when (parentId) {
            ROOT_ID -> result.sendResult(
                mutableListOf(
                    MediaBrowserCompat.MediaItem(
                        MediaDescriptionCompat.Builder()
                            .setMediaId(QUEUE_ID)
                            .setTitle("Queue")
                            .build(),
                        MediaBrowserCompat.MediaItem.FLAG_BROWSABLE
                    )
                )
            )
            QUEUE_ID -> result.sendResult(
                MediaStateManager.queue.map { item ->
                    MediaBrowserCompat.MediaItem(
                        MediaDescriptionCompat.Builder()
                            .setMediaId(item.mediaId)
                            .setTitle(item.title)
                            .setSubtitle(item.artist)
                            .build(),
                        MediaBrowserCompat.MediaItem.FLAG_PLAYABLE
                    )
                }.toMutableList()
            )
            else -> result.sendResult(mutableListOf())
        }
    }

    inner class SessionCallback : MediaSessionCompat.Callback() {
        override fun onPlay() = safeEmit("play", null)
        override fun onPause() = safeEmit("pause", null)
        override fun onSkipToNext() = safeEmit("next", null)
        override fun onSkipToPrevious() = safeEmit("previous", null)
        override fun onSeekTo(pos: Long) = safeEmit("seekTo", pos.toDouble() / 1000.0)

        override fun onSkipToQueueItem(id: Long) {
            safeEmit("skipToIndex", id.toInt())
        }

        override fun onStop() {
            safeEmit("stop", null)
            stopPlaybackAndService()
        }

        // Invoked directly by the OS (lock screen, notification, Bluetooth AVRCP,
        // and the Quick Settings expanded media panel) via Binder, on the app's
        // main process — an uncaught exception here crashes the whole app, not
        // just the calling UI, so every command is defensively caught and logged.
        private fun safeEmit(command: String, data: Any?) {
            try {
                RockItMediaModule.emitEvent("autoCommand", command)
                if (data != null) RockItMediaModule.emitEvent("autoCommandData_$command", data)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to handle media session command: $command", e)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        executor.shutdownNow()
        MediaStateManager.removeChangeListener(stateChangeListener)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            audioManager.unregisterAudioDeviceCallback(audioDeviceCallback)
        }
        mediaSession.release()
    }
}
