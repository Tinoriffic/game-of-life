//
//  MeV2WidgetBundle.swift
//  MeV2Widget
//
//  Created by Faustino on 7/21/26.
//

import WidgetKit
import SwiftUI

@main
struct MeV2WidgetBundle: WidgetBundle {
    var body: some Widget {
        MeV2Widget()
        // Live Activity for the meditation / workout-rest countdowns.
        if #available(iOS 16.1, *) {
            TimerLiveActivity()
        }
    }
}
