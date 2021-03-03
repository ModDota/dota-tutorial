function setTimerValue(event:ClockTimeEvent) {
    var mainPanel = $.GetContextPanel().GetParent()!.GetParent()!;
    var gameTime = mainPanel.FindChildTraverse("GameTime") as LabelPanel;

    let s = event.seconds.toString();
    if (event.seconds < 10) {
        s = "0" + event.seconds;
    }
    
    let m = "xx"
    if (event.minutes !== undefined) {
        if (event.minutes < 10) {
            m = "0" + event.minutes
        } else {
            m = event.minutes.toString();
        }
    }
    gameTime.text = m + ":" + s;
}

GameEvents.Subscribe("set_client_clock", event => {
    setTimerValue(event);
});

