import { addChild } from './addChild'
import { toJson } from './toJson'
import { TCTXoptions, TContext, TFlow, CallbackFunction, Callbacks, ActionPropertiesKeyword } from '../../types'
import flatObject from '../../utils/flattener'
import { generateRef } from '../../utils/hash'

/**
 * @public
 * @param inCtx
 * @returns
 */
const addAnswer =
    <P = any>(inCtx: TContext | TFlow<P>) =>
    (
        answer: string | string[],
        options?: ActionPropertiesKeyword,
        cb?: CallbackFunction<P> | null,
        nested?: TFlow<P>[] | TFlow<P>
    ): TFlow<P> => {
        const lastCtx = ('ctx' in inCtx ? inCtx.ctx : inCtx) as TContext

        nested = nested ?? []
        answer = Array.isArray(answer) ? answer.join('\n') : answer

        const getAnswerOptions = (): TCTXoptions => ({
            media: typeof options?.media === 'string' ? options.media : undefined,
            buttons: Array.isArray(options?.buttons) ? options.buttons : [],
            capture: typeof options?.capture === 'boolean' ? options.capture : false,
            delay: typeof options?.delay === 'number' ? options.delay : 0,
            idle: typeof options?.idle === 'number' ? options.idle : undefined,
            ref: typeof options?.ref === 'string' ? options.ref : undefined,
        })

        const getNested = () => {
            let flatNested: (TFlow<P> | TContext)[] = []
            if (Array.isArray(nested)) {
                for (const iterator of nested) {
                    flatNested = [...flatNested, ...addChild(iterator)]
                }

                return {
                    nested: flatNested,
                }
            }
            return {
                nested: addChild(nested),
            }
        }

        const getCbFromNested = () => {
            const nestedArray = Array.isArray(nested) ? nested : [nested]
            return flatObject(nestedArray)
        }

        const callback = typeof cb === 'function' ? cb : () => {}

        const ctxAnswer = (): TContext => {
            const options = {
                ...getAnswerOptions(),
                ...getNested(),
                keyword: {},
                callback: !!cb,
            }

            const ref = options.ref ?? `ans_${generateRef()}`

            const json = [].concat(lastCtx.json).concat([
                {
                    ref,
                    keyword: lastCtx.ref,
                    answer,
                    options,
                },
            ])

            const callbacks: Callbacks = {
                ...lastCtx.callbacks,
                ...getCbFromNested(),
                [ref]: callback,
            }

            return {
                ...lastCtx,
                ref,
                answer,
                json,
                options,
                callbacks,
            }
        }

        const ctx = ctxAnswer()

        return {
            ctx,
            ref: ctx.ref,
            addAnswer: addAnswer(ctx),
            addAction: (cb: CallbackFunction<P> = () => {}, flagCb: CallbackFunction<P> = () => {}): TFlow<P> => {
                if (typeof cb === 'object') return addAnswer(ctx)('__capture_only_intended__', cb, flagCb)
                return addAnswer(ctx)('__call_action__', null, cb as CallbackFunction<P>)
            },
            toJson: toJson(ctx),
        }
    }

export { addAnswer }