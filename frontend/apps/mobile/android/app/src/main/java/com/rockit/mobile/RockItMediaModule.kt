package com.rockit.mobile

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.modules.core.DeviceEventManagerModule

class RockItMediaModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    init {
        instance = this
    }

    override fun getName() = "RockItMedia"

    @ReactMethod
    fun updateNowPlaying(title: String, artist: String, album: String, artworkUrl: String, duration: Double) {
        MediaStateManager.title = title
        MediaStateManager.artist = artist
        MediaStateManager.album = album
        MediaStateManager.artworkUrl = artworkUrl.ifEmpty { null }
        MediaStateManager.duration = duration.toLong()
        MediaStateManager.notifyChange()
    }

    @ReactMethod
    fun updatePlaybackState(isPlaying: Boolean, position: Double) {
        MediaStateManager.isPlaying = isPlaying
        MediaStateManager.position = position.toLong()
        MediaStateManager.notifyChange()
    }

    @ReactMethod
    fun updateQueue(queue: ReadableArray, currentIndex: Int) {
        val items = mutableListOf<AutoQueueItem>()
        for (i in 0 until queue.size()) {
            val item = queue.getMap(i) ?: continue
            items.add(
                AutoQueueItem(
                    mediaId = item.getString("mediaId") ?: "",
                    title = item.getString("title") ?: "",
                    artist = item.getString("artist") ?: "",
                    album = item.getString("album") ?: "",
                    artworkUrl = item.getString("artworkUrl"),
                    duration = (item.getDouble("duration")).toLong()
                )
            )
        }
        MediaStateManager.queue = items
        MediaStateManager.currentQueueIndex = currentIndex
        MediaStateManager.notifyChange()
    }

    // Required by NativeEventEmitter on the JS side
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    companion object {
        private var instance: RockItMediaModule? = null

        fun emitEvent(eventName: String, data: Any?) {
            instance?.reactApplicationContext
                ?.takeIf { it.hasActiveReactInstance() }
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, data)
        }
    }
}
