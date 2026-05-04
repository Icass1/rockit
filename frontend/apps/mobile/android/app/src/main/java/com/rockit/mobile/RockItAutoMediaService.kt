package com.rockit.mobile

import android.os.Bundle
import android.support.v4.media.MediaBrowserCompat
import android.support.v4.media.MediaDescriptionCompat
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import androidx.media.MediaBrowserServiceCompat

class RockItAutoMediaService : MediaBrowserServiceCompat() {

    private lateinit var mediaSession: MediaSessionCompat

    private val stateChangeListener: () -> Unit = { updateSession() }

    companion object {
        private const val ROOT_ID = "root"
        private const val QUEUE_ID = "queue"
    }

    override fun onCreate() {
        super.onCreate()

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

    private fun updateSession() {
        val metadata = MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, MediaStateManager.title)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, MediaStateManager.artist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, MediaStateManager.album)
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, MediaStateManager.duration)
            .build()
        mediaSession.setMetadata(metadata)

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
            // id is the queue index
            emit("skipToIndex", id.toInt())
        }

        private fun emit(command: String, data: Any?) {
            RockItMediaModule.emitEvent("autoCommand", command)
            if (data != null) RockItMediaModule.emitEvent("autoCommandData_$command", data)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        MediaStateManager.removeChangeListener(stateChangeListener)
        mediaSession.release()
    }
}
