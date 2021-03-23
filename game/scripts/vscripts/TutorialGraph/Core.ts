import { completeOnCheck } from "./Steps"

/**
 * Shared context in a tutorial graph.
 */
export type TutorialContext = {
    [key: string]: any
}

export type StepArgument<T> = T | ((context: TutorialContext) => T)

export const getArg = <T>(arg: StepArgument<T>, context: TutorialContext): T => {
    // TODO: Make this work when T is a function
    if (typeof arg === "function") {
        return (arg as (context: TutorialContext) => T)(context)
    }

    return arg as T
}

export const getOptionalArg = <T>(arg: StepArgument<T> | undefined, context: TutorialContext): T | undefined => {
    if (arg === undefined) {
        return undefined
    }

    return getArg(arg, context)
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

    /**
     * Called when we want the step to stop its execution. Should cleanup any resources it uses too such as timers and spawned units.
     */
    stop: (context: TutorialContext) => void
}

/**
 * Creates a tutorial step given the start function and optionally the stop function.
 * @param start Called when the step is started. Should call complete when the step is done. Can use context to share data with other steps.
 * @param stop Called when we want the step to stop its execution. Should cleanup any resources it uses too such as timers and spawned units. If not passed, does nothing on stop.
 */
export const step = (start: (context: TutorialContext, complete: () => void) => void, stop?: (context: TutorialContext) => void): TutorialStep => {
    // Default implementation for stop does nothing.
    if (!stop) {
        stop = () => { }
    }

    return { start, stop }
}

/**
 * Creates a tutorial step that waits for all steps to complete in parallel before completing itself.
 * @param steps List of tutorial steps to wrap in parallel.
 */
export const fork = (steps: StepArgument<TutorialStep[]>): TutorialStep => {
    let actualSteps: TutorialStep[] | undefined = undefined

    return step((context, onComplete) => {
        actualSteps = getArg(steps, context)

        const stepsCompleted = actualSteps.map(s => false)

        // Once all steps are completed, complete ourselves
        for (let i = 0; i < actualSteps.length; i++) {
            const stepIndex = i
            actualSteps[stepIndex].start(context, () => {
                stepsCompleted[stepIndex] = true
                if (stepsCompleted.every(c => c)) {
                    onComplete()
                }
            })
        }
    }, context => {
        if (actualSteps) {
            actualSteps.forEach(step => step.stop(context))
            actualSteps = undefined
        }
    })
}

/**
 * Creates a tutorial step that waits for any step to complete in parallel before completing itself.
 * @param steps List of tutorial steps to wrap in parallel.
 */
export const forkAny = (steps: StepArgument<TutorialStep[]>): TutorialStep => {
    let actualSteps: TutorialStep[] | undefined = undefined

    return step((context, onComplete) => {
        actualSteps = getArg(steps, context)

        // Once one step completes, stop all others and complete ourselves
        for (const step of actualSteps) {
            step.start(context, () => {
                if (actualSteps) {
                    actualSteps.filter(otherStep => otherStep !== step).forEach(otherStep => otherStep.stop(context))
                }
                onComplete()
            })
        }
    }, context => {
        if (actualSteps) {
            actualSteps.forEach(step => step.stop(context))
            actualSteps = undefined
        }
    })
}

/**
 * Creates a tutorial step that executes individual steps one after another. The step completes when the final step was completed.
 * @param steps List of tutorial steps to wrap sequentially.
 */
export const seq = (steps: StepArgument<TutorialStep[]>): TutorialStep => {
    let actualSteps: TutorialStep[] | undefined = undefined

    return step((context, onComplete) => {
        actualSteps = getArg(steps, context)

        const startStep = (i: number) => {
            if (actualSteps) {
                const step = actualSteps[i]

                if (i + 1 >= actualSteps.length) {
                    step.start(context, onComplete)
                } else {
                    step.start(context, () => startStep(i + 1))
                }
            }
        }

        if (actualSteps.length > 0) {
            startStep(0)
        } else {
            onComplete()
        }
    }, context => {
        if (actualSteps) {
            actualSteps.forEach(step => step.stop(context))
            actualSteps = undefined
        }
    })
}

/**
 * Creates a while loop that executes the step while a condition is true. Completes when the condition evaluates to false during a loop.
 * @param condition Condition to check before executing the step or completing.
 * @param loopStep Step to execute in a loop while condition is true.
 */
export const loop = (condition: StepArgument<boolean>, loopStep: StepArgument<TutorialStep>): TutorialStep => {
    let actualLoopStep: TutorialStep | undefined = undefined

    return step((context, onComplete) => {
        const loopStart = () => {
            const actualCondition = getArg(condition, context)
            if (actualCondition) {
                actualLoopStep = getArg(loopStep, context)
                actualLoopStep.start(context, () => loopStart())
            } else {
                actualLoopStep = undefined
                onComplete()
            }
        }

        loopStart()
    }, context => {
        if (actualLoopStep) {
            actualLoopStep.stop(context)
            actualLoopStep = undefined
        }
    })
}
