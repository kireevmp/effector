//@flow

import {is} from 'effector/validate'
import {eventFabric, createLink} from 'effector/event'
import {storeFabric, createStoreObject} from 'effector/store'
import {
  step,
  type Graphite,
  createStateRef,
  readRef,
  writeRef,
  nextBarrierID,
} from 'effector/stdlib'

import invariant from 'invariant'

const sampleFabric = ({
  source,
  sampler,
  fn,
  target,
}: {
  source: Graphite,
  sampler: Graphite,
  fn?: (source: any, sampler: any) => any,
  target: Graphite,
}) => {
  const state = createStateRef()
  const hasValue = createStateRef(false)
  createLink(source, {
    scope: {
      hasValue,
    },
    node: [
      step.update({store: state}),
      step.tap({
        fn(upd, {hasValue}) {
          writeRef(hasValue, true)
        },
      }),
    ],
  })
  return createLink(sampler, {
    scope: {
      state,
      hasValue,
      fn,
    },
    child: [target],
    node: [
      step.filter({
        fn: (upd, {hasValue}) => readRef(hasValue),
      }),
      step.barrier({
        barrierID: nextBarrierID(),
        priority: 'sampler',
      }),
      step.compute({
        fn: fn
          ? (upd, {state, fn}) => fn(readRef(state), upd)
          : (upd, {state}) => readRef(state),
      }),
    ],
  })
}

export function sample(
  source: any,
  sampler: Graphite,
  fn?: (source: any, sampler: any) => any,
): any {
  if (!sampler) {
    return sampleFabric(source)
  }

  let target
  if (is.store(source)) {
    target = storeFabric({
      currentState: readRef(source.stateRef),
      config: {name: source.shortName},
      parent: source.domainName,
    })
  } else {
    target = eventFabric({
      name: source.shortName,
      parent: source.domainName,
    })
  }
  if (is.unit(source)) {
    sampleFabric({source, sampler, fn, target})
    return target
  }
  if (Array.isArray(source) || (typeof source === 'object' && source !== null)) {
    const store = createStoreObject(source)
    target = storeFabric({
      currentState: readRef(shape.stateRef),
      config: {name: shape.shortName},
      parent: shape.domainName,
    })
    sampleFabric({source: store, sampler, fn, target})
    return target
  }
  invariant(
    false,
    'sample: First argument should be Event, ' +
      'Store, Effect [store, store, ...], or ' +
      '{foo: store, bar: store}',
  )
}
