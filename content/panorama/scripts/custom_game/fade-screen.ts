const overlayDuration = 10; // Should match the css animation duration of FadeScreenAnimation

(() => {
    const container = $("#FadeScreenContainer");
    container.RemoveClass("Visible");

    function fadeBlack() {
        container.AddClass("Visible");
        $.Schedule(overlayDuration, () => {
            fadeIn();
        });
    }

    function fadeIn() {
        container.RemoveClass("Visible");
    }

    GameEvents.Subscribe("fade_screen", event => {
        fadeBlack();
    });

    GameEvents.Subscribe("fade_screen_in", event => {
        fadeIn();
    });
})();
