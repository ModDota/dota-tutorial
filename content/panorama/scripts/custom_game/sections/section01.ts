GameUI.CustomUIConfig().SectionSelector.RegisterSection(
    SectionName.Section01,
    {
        panel: $.GetContextPanel(),
        onShow: () => {
            $.Msg("onShow section01");
        },
        onHide: () => {
            $.Msg("onHide Section01");
        }
    }
);