package com.flow.finance

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.flow.finance.core.FlowCorePlugin

class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        // FlowCore: local native engine (SMS, notifications, parser, SQLite).
        // Registered before super.onCreate() so the bridge picks it up.
        registerPlugin(FlowCorePlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
