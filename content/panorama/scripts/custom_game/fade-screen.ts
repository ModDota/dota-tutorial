const overlayDuration = 10; // Should match the css animation duration of FadeScreenAnimation

(() => {
    const container = $("#FadeScreenContainer");

    function fadeBlack() {
        const overlay = $.CreatePanel("Panel", container, "");
        overlay.AddClass("FadeScreenAnimation");
        $.Schedule(overlayDuration, () => {
            fadeIn();
        });
    }

    function fadeIn() {
        container.RemoveAndDeleteChildren();
    }

    GameEvents.Subscribe("fade_screen", event => {
        fadeBlack();
    });

    GameEvents.Subscribe("fade_screen_in", event => {
        fadeIn();
    });
})();
