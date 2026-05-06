package com.rockit.mobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Bundle
import android.support.v4.media.MediaBrowserCompat
import android.support.v4.media.MediaDescriptionCompat
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
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
    private val executor = Executors.newSingleThreadExecutor()
    private var currentArtwork: Bitmap? = null
    private var lastArtworkUrl: String? = null

    @Volatile
    private var isForeground = false

    private val stateChangeListener: () -> Unit = { updateSession() }

    companion object {
        private const val ROOT_ID = "root"
        private const val QUEUE_ID = "queue"
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
        updateSession()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        MediaButtonReceiver.handleIntent(mediaSession, intent)
        return START_NOT_STICKY
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

    private fun updateSession() {
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
                PlaybackStateCompat.ACTION_SKIP_TO_QUEUE_ITEM
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
                    applyMetadata()
                    postNotification()
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
        override fun onPlay() = emit("play", null)
        override fun onPause() = emit("pause", null)
        override fun onSkipToNext() = emit("next", null)
        override fun onSkipToPrevious() = emit("previous", null)
        override fun onSeekTo(pos: Long) = emit("seekTo", pos.toDouble() / 1000.0)

        override fun onSkipToQueueItem(id: Long) {
            emit("skipToIndex", id.toInt())
        }

        private fun emit(command: String, data: Any?) {
            RockItMediaModule.emitEvent("autoCommand", command)
            if (data != null) RockItMediaModule.emitEvent("autoCommandData_$command", data)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        executor.shutdownNow()
        MediaStateManager.removeChangeListener(stateChangeListener)
        mediaSession.release()
    }
}
