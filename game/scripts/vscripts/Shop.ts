let shopOpen = false;
CustomGameEventManager.RegisterListener("shop_open_changed", (source, event) => {
    shopOpen = event.open !== 0;
})

/**
 * Returns whether the shop ui is currently open.
 * @returns Whether the shop ui is currently open.
 */
export function isShopOpen() {
    return shopOpen;
}
