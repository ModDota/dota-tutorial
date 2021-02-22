/**
 * Shared context in a tutorial graph.
 */
export type TutorialContext = {
    [key: string]: any
}

/**
 * Node in the tutorial graph. Can be composed with tutStep and tutFork to build
 * a tutorial graph.
 */
export type TutorialStep = {
    /**
     * Called when the step is started. Should call complete when the step is done. Can use context to share data with other steps.
     */
    start: (context: TutorialContext, complete: () => void) => void
}

/**
 * Creates a tutorial step given the start function.
 * @param start Called when the step is started. Should call complete when the step is done. Can use context to share data with other steps.
 */
export const step = (start: (context: TutorialContext, complete: () => void) => void): TutorialStep => {
    return { start }
}

/**
 * Creates a tutorial step that waits for steps to complete in parallel before completing itself.
 * @param steps List of tutorial steps to wrap in parallel.
 */
export const fork = (...steps: TutorialStep[]): TutorialStep => {
    const stepsCompleted = steps.map(s => false)

    return step((context, onComplete) => {
        // Once all steps are completed, complete ourselves
        for (let i = 0; i < steps.length; i++) {
            const stepIndex = i
            steps[stepIndex].start(context, () => {
                stepsCompleted[stepIndex] = true
                if (stepsCompleted.every(c => c)) {
                    onComplete()
                }
            })
        }
    })
}

/**
 * Creates a tutorial step that executes individual steps one after another. The step completes when the final step was completed.
 * @param steps List of tutorial steps to wrap sequentially.
 */
export const seq = (...steps: TutorialStep[]): TutorialStep => {
    return step((context, onComplete) => {
        const startStep = (i: number) => {
            const step = steps[i]

            if (i + 1 >= steps.length) {
                step.start(context, onComplete)
            } else {
                step.start(context, () => startStep(i +  1))
            }
        }

        startStep(0)
    })
}
