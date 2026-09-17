import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/** A persisted on/off setting, which is unknown until storage answers.
 *
 *  Why the union rather than a plain boolean seeded with a default: AsyncStorage
 *  reads are async, so seeding renders a guess. A switch whose stored value is
 *  the non-default one then paints the wrong way and visibly flips when the read
 *  lands, which reads as the toggle undoing itself. Callers render nothing for
 *  the control until the value is real. */
export type StoredToggleSetting =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly value: boolean }

type UseStoredToggleSettingOptions = {
  readonly load: () => Promise<boolean>
  readonly save: (value: boolean) => Promise<void>
}

type StoredToggleSettingModel = {
  readonly setting: StoredToggleSetting
  readonly setValue: (value: boolean) => void
}

export function useStoredToggleSetting({
  load,
  save
}: UseStoredToggleSettingOptions): StoredToggleSettingModel {
  const [setting, setSetting] = useState<StoredToggleSetting>({ status: 'loading' })
  // Why: a tap before the initial read resolves must win — otherwise the delayed
  // read would clobber the user's choice with the stored (now stale) value.
  const userToggledRef = useRef(false)
  const loadRef = useRef(load)
  const saveRef = useRef(save)
  useLayoutEffect(() => {
    loadRef.current = load
    saveRef.current = save
  }, [load, save])

  useEffect(() => {
    let stale = false
    void loadRef.current().then((value) => {
      if (!stale && !userToggledRef.current) {
        setSetting({ status: 'ready', value })
      }
    })
    return () => {
      stale = true
    }
  }, [])

  const setValue = useCallback((value: boolean) => {
    userToggledRef.current = true
    setSetting({ status: 'ready', value })
    void saveRef.current(value)
  }, [])

  return { setting, setValue }
}
