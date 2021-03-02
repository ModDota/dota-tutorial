"use strict";

function SetItem(unitName: string, text: string) {
    ($("#DialogPortrait") as ScenePanel).SetUnit(unitName, "", true);
    ($("#DialogText") as LabelPanel).text = text;
}

(function () {
    ($.GetContextPanel() as DialogLinePanel).SetItem = SetItem;
})();
