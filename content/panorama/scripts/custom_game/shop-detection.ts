(() => {
    const updateInterval = 0.1;
    let previousShopOpen = false;

    // Periodically check whether the shop was opened or closed and send an event to the server.
    function checkShopOpen() {
        const shopOpen = Game.IsShopOpen();

        if (shopOpen !== previousShopOpen) {
            GameEvents.SendCustomGameEventToServer("shop_open_changed", { open: shopOpen });
        }

        previousShopOpen = shopOpen;

        $.Schedule(updateInterval, checkShopOpen);
    }

    $.Schedule(updateInterval, checkShopOpen);
})();
