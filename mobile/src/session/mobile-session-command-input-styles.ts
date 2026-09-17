import { StyleSheet } from 'react-native'

import { colors, spacing, radii, typography } from '../theme/mobile-theme'

export const mobileSessionCommandInputStyles = StyleSheet.create({
  createWarningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.bgPanel,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  createWarningText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 16
  },
  createWarningDismiss: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: typography.bodySize,
    marginBottom: spacing.lg
  },
  createError: {
    color: colors.statusRed,
    fontSize: 13,
    marginBottom: spacing.sm
  },
  emptyActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm
  },
  createButton: {
    backgroundColor: colors.bgRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.button
  },
  createButtonDisabled: {
    opacity: 0.5
  },
  createButtonText: {
    color: colors.textPrimary,
    fontSize: typography.bodySize,
    fontWeight: '600'
  },
  commandDock: {
    zIndex: 20
  },
  // Why absolute rather than letting the dock grow in flow: the terminal must not
  // resize when the composer expands. MobileSessionContentRow already translates
  // the dock instead of resizing so keyboard toggles can't trigger a server-side
  // PTY viewport change, and expanding has to respect the same rule. Pinning
  // top/bottom also caps the composer at the content area with no measurement.
  commandDockExpanded: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'flex-end'
  },
  accessoryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.bgPanel
  },
  accessoryScroll: {
    flex: 1,
    minWidth: 0
  },
  accessoryContent: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs
  },
  accessoryKey: {
    backgroundColor: colors.bgRaised,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.button,
    minWidth: 36,
    alignItems: 'center'
  },
  accessoryKeyPressed: {
    backgroundColor: colors.borderSubtle
  },
  accessoryKeyActive: {
    backgroundColor: colors.textPrimary
  },
  customAccessoryKey: {
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  accessoryKeyDisabled: {
    opacity: 0.35
  },
  accessoryKeyText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontFamily: typography.monoFamily
  },
  accessoryKeyTextActive: {
    color: colors.bgBase,
    fontWeight: '700'
  },
  accessoryKeyTextDisabled: {
    color: colors.textMuted
  },
  keyboardDismissKey: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    marginVertical: spacing.xs,
    backgroundColor: colors.bgRaised,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 0,
    borderRadius: radii.button,
    minWidth: 36,
    height: 28
  },
  keyboardDismissGlyph: {
    alignItems: 'center',
    height: 18,
    justifyContent: 'flex-start',
    position: 'relative',
    width: 18
  },
  keyboardDismissChevron: {
    bottom: -2,
    position: 'absolute'
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.bgPanel
  },
  // Why flexShrink: expanded, the bar's content can exceed the content area;
  // shrinking keeps it inside instead of overflowing past the tab strip.
  inputBarExpanded: {
    flexShrink: 1,
    alignItems: 'flex-end'
  },
  textInputExpanded: {
    flex: 1,
    height: undefined,
    minHeight: 34,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm
  },
  expandKey: {
    width: 34,
    height: 34,
    borderRadius: radii.input,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm
  },
  // Why multiline even when compact: switching the prop at runtime swaps
  // UITextField for UITextView on iOS, a native remount that would end an
  // in-progress dictation. The field is multiline from the start and only its
  // box grows. paddingTop centres the single compact line, which paddingVertical: 0
  // did for the old single-line field.
  textInput: {
    flex: 1,
    height: 34,
    backgroundColor: colors.bgRaised,
    color: colors.textPrimary,
    borderRadius: radii.input,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 0,
    fontSize: 14,
    fontFamily: typography.monoFamily,
    marginRight: spacing.sm
  },
  liveInputBar: {
    gap: spacing.sm
  },

  liveInputFocusTarget: {
    flex: 1,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.input,
    paddingHorizontal: spacing.sm + 2
  },

  liveInputFocusTargetPressed: {
    backgroundColor: colors.borderSubtle
  },

  liveInputFocusTargetDisabled: {
    opacity: 0.45
  },

  liveInputCapture: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
    color: colors.textPrimary
  },
  sendButton: {
    backgroundColor: colors.bgRaised,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dictationButton: {
    backgroundColor: colors.bgRaised,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm
  },
  dictationButtonActive: {
    backgroundColor: colors.bgPanel,
    borderColor: colors.textSecondary
  },
  sendButtonDisabled: {
    opacity: 0.35
  }
})
