interface MyTestEvent {
    foo: string;
    bar: number;
}

interface CustomGameEventDeclarations {
    // Allows you to register event listeners and fire event 'my_custom_event' with MyTestEvent data
    my_custom_event: MyTestEvent
}