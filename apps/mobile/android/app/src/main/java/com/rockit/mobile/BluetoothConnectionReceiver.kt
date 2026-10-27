package com.rockit.mobile

import android.bluetooth.BluetoothA2dp
import android.bluetooth.BluetoothProfile
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BluetoothConnectionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            BluetoothA2dp.ACTION_CONNECTION_STATE_CHANGED -> {
                val state = intent.getIntExtra(BluetoothProfile.EXTRA_STATE, -1)
                when (state) {
                    BluetoothProfile.STATE_CONNECTED -> {
                        RockItMediaModule.emitEvent("bluetoothConnected", null)
                        tryLaunchApp(context)
                    }
                    BluetoothProfile.STATE_DISCONNECTED -> {
                        RockItMediaModule.emitEvent("bluetoothDisconnected", null)
                    }
                }
            }
        }
    }

    // Attempts to bring the app to the foreground when an audio device connects.
    // On Android 10+ this only works if the app already has a foreground service running
    // (which expo-media-control provides during media playback). If the app is not
    // playing and fully backgrounded, the intent is silently dropped by the OS.
    private fun tryLaunchApp(context: Context) {
        try {
            val launchIntent = Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                action = Intent.ACTION_MAIN
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            context.startActivity(launchIntent)
        } catch (_: Exception) {}
    }
}
