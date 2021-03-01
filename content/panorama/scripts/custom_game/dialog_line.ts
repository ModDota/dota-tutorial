"use strict";

function SetItem(unitName: string, text: string) {
    ($("#DialogPortrait") as HeroImage).heroname = unitName;
    ($("#DialogText") as LabelPanel).text = text;
}

(function () {
    ($.GetContextPanel() as DialogLinePanel).SetItem = SetItem;
})();
