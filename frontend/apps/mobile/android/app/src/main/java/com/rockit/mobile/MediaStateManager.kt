package com.rockit.mobile

import java.util.concurrent.CopyOnWriteArrayList

data class AutoQueueItem(
    val mediaId: String,
    val title: String,
    val artist: String,
    val album: String,
    val artworkUrl: String?,
    val duration: Long
)

object MediaStateManager {
    var title: String = ""
    var artist: String = ""
    var album: String = ""
    var artworkUrl: String? = null
    var duration: Long = 0L
    var isPlaying: Boolean = false
    var position: Long = 0L
    var queue: List<AutoQueueItem> = emptyList()
    var currentQueueIndex: Int = 0

    private val changeListeners = CopyOnWriteArrayList<() -> Unit>()

    fun addChangeListener(listener: () -> Unit) = changeListeners.add(listener)
    fun removeChangeListener(listener: () -> Unit) = changeListeners.remove(listener)

    fun notifyChange() = changeListeners.forEach { it() }
}
