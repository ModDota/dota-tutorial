const localizationRegex = /#[a-zA-Z0-9_-]+/g; // '#' followed by one or more non-whitespaces

const localizeInline = (text: string): string => text.includes("#") ? text.replace(localizationRegex, match => $.Localize(match)) : $.Localize(text)

interface CustomUIConfig {
    /**
     * Replaces occurences of localizable keys starting with '#' within the string and returns the result.
     * If the string does not contain '#' uses the normal localization function.
     * Example: "Text Text #Token1 Text #Token2" => "Text Text Token one Text Token two"
     * @param text String within which we want to replace localization keys.
     */
    localizeInline: typeof localizeInline;
}

GameUI.CustomUIConfig().localizeInline = localizeInline;
