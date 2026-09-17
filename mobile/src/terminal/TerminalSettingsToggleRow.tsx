import { Switch, Text, View } from 'react-native'
import { colors } from '../theme/mobile-theme'
import { terminalSettingsScreenStyles as styles } from './terminal-settings-screen-styles'
import type { StoredToggleSetting } from '../settings/use-stored-toggle-setting'

type TerminalSettingsToggleRowProps = {
  readonly label: string
  readonly setting: StoredToggleSetting
  readonly describeValue: (value: boolean) => string
  readonly onValueChange: (value: boolean) => void
}

// Why hide rather than unmount the switch while loading: it keeps its slot, so
// the row does not jump when storage answers, and no value is shown before it
// is known. Seeding a default instead made the switch paint the wrong way and
// visibly flip, which reads as the toggle undoing itself.
export function TerminalSettingsToggleRow({
  label,
  setting,
  describeValue,
  onValueChange
}: TerminalSettingsToggleRowProps) {
  const ready = setting.status === 'ready'
  return (
    <View style={styles.row}>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSublabel}>{ready ? describeValue(setting.value) : ' '}</Text>
      </View>
      <Switch
        value={ready ? setting.value : false}
        disabled={!ready}
        onValueChange={onValueChange}
        style={ready ? undefined : styles.toggleHiddenUntilLoaded}
        trackColor={{ false: colors.bgRaised, true: colors.textSecondary }}
        thumbColor={colors.textPrimary}
      />
    </View>
  )
}
