import { useEffect, useRef, useState } from 'react'
import { View, Text, ScrollView, TextInput, Pressable, Platform } from 'react-native'
import {
  ChevronDown,
  ChevronsRight,
  Keyboard as KeyboardIcon,
  Monitor,
  Plus,
  Smartphone
} from 'lucide-react-native'
import { triggerMediumImpact } from '../platform/haptics'
import { createTerminalLiveAccessoryInput } from '../terminal/terminal-live-accessory-input'
import { useTerminalLiveInputCapture } from '../terminal/terminal-live-input-capture-store'
import { getTerminalLiveInputKeyboardType } from '../terminal/terminal-keyboard-type'
import { MobileTerminalCommandComposer } from './MobileTerminalCommandComposer'
import { MobileTerminalLiveInputStatus } from './MobileTerminalLiveInputStatus'
import { MobileTerminalInputActions } from './MobileTerminalInputActions'
import { isTerminalPhoneDisplayMode } from './mobile-session-route-helpers'
import { colors } from '../theme/mobile-theme'
import { styles } from './mobile-session-styles'
import type { MobileSessionController } from './use-mobile-session-controller'

export function MobileSessionCommandDock({ controller }: { controller: MobileSessionController }) {
  const {
    insets,
    bufferedTerminalDraftState,
    liveInputCaptureStore,
    activeHandle,
    customKeys,
    setShowCustomKeyModal,
    setDeleteKeyTarget,
    visibleBuiltInAccessoryKeys,
    terminalModes,
    canPaste,
    dictationMode,
    liveInputRef,
    handleLiveInputChange,
    handleLiveInputKeyPress,
    handleLiveInputSubmit,
    getLiveInteractionGeneration,
    getSendCompletionGeneration,
    dismissKeyboardAfterAgentSend,
    activeSessionTab,
    canSend,
    canCompose,
    canHoldLiveKeyboard,
    liveInputEnabled,
    focusLiveInput,
    showNativeChat,
    dictation,
    cancelDictation,
    handleDictationToggle,
    handleDictationPressIn,
    handleDictationPressOut,
    toggleDisplayMode,
    handleAccessoryKey,
    dismissSoftwareKeyboard,
    toggleLiveInput,
    stopAccessoryRepeat,
    startAccessoryRepeat,
    handlePaste,
    isAttaching,
    attachImage,
    activeMarkdownTab,
    activeFileTab,
    activeBrowserTab,
    keyboardLift
  } = controller
  // Why: subscribed here, not lifted to screen state, so a keystroke re-renders
  // this dock instead of the whole session surface.
  const liveInputCapture = useTerminalLiveInputCapture(liveInputCaptureStore)
  const [composerExpanded, setComposerExpanded] = useState(false)
  const bufferedDraft = bufferedTerminalDraftState.input
  const previousBufferedDraftRef = useRef(bufferedDraft)
  useEffect(() => {
    // Why collapse on the non-empty -> empty transition rather than on send: an
    // accepted send clears the draft, and a tall empty box would cover the output
    // it just produced. A rejected send restores the text, so the box stays up.
    // Expanding an already-empty box (the usual case before dictating) is untouched.
    const emptiedBySend = previousBufferedDraftRef.current !== '' && bufferedDraft === ''
    previousBufferedDraftRef.current = bufferedDraft
    if (emptiedBySend) {
      setComposerExpanded(false)
    }
  }, [bufferedDraft])
  // Why: the expanded overlay belongs to one terminal's draft, and live mode has
  // no local buffer to show at all.
  useEffect(() => {
    setComposerExpanded(false)
  }, [activeHandle, liveInputEnabled])
  const expandedComposer = composerExpanded && !liveInputEnabled
  return (
    !activeMarkdownTab &&
    !activeFileTab &&
    !activeBrowserTab &&
    !showNativeChat && (
      <View
        style={[
          styles.commandDock,
          expandedComposer && styles.commandDockExpanded,
          { paddingBottom: insets.bottom, transform: [{ translateY: -keyboardLift }] }
        ]}
        // Why box-none: expanded, the dock spans the content area, and taps above
        // the bar must still reach the terminal behind it.
        pointerEvents={expandedComposer ? 'box-none' : 'auto'}
      >
        {/* Accessory keys */}
        <View style={styles.accessoryBar}>
          {/* Why: fixed keyboard escape hatch; outside ScrollView + shortcut path so it can't scroll away or be hidden (#5106). */}
          {keyboardLift > 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.keyboardDismissKey,
                pressed && styles.accessoryKeyPressed
              ]}
              onPress={dismissSoftwareKeyboard}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Dismiss keyboard"
              accessibilityHint="Hides the software keyboard and keeps the current terminal session open."
            >
              <View style={styles.keyboardDismissGlyph}>
                <KeyboardIcon size={15} color={colors.textSecondary} strokeWidth={2} />
                <ChevronDown
                  size={10}
                  color={colors.textSecondary}
                  strokeWidth={2.5}
                  style={styles.keyboardDismissChevron}
                />
              </View>
            </Pressable>
          )}
          {/* Why: default tap handling makes the first accessory-key tap dismiss the keyboard and get swallowed (#5106). */}
          <ScrollView
            style={styles.accessoryScroll}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.accessoryContent}
            keyboardShouldPersistTaps="always"
          >
            <Pressable
              style={({ pressed }) => [
                styles.accessoryKey,
                pressed && styles.accessoryKeyPressed,
                !canSend && styles.accessoryKeyDisabled
              ]}
              disabled={!canSend}
              onPress={() => {
                if (activeHandle) {
                  void toggleDisplayMode(activeHandle)
                }
              }}
              accessibilityLabel={
                isTerminalPhoneDisplayMode(activeHandle, terminalModes)
                  ? 'Switch to desktop mode'
                  : 'Switch to phone mode'
              }
            >
              {isTerminalPhoneDisplayMode(activeHandle, terminalModes) ? (
                <Monitor size={14} color={canSend ? colors.textSecondary : colors.textMuted} />
              ) : (
                <Smartphone size={14} color={canSend ? colors.textSecondary : colors.textMuted} />
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.accessoryKey,
                liveInputEnabled && styles.accessoryKeyActive,
                pressed && styles.accessoryKeyPressed,
                !canCompose && styles.accessoryKeyDisabled
              ]}
              // Why: offline, live mode is dead but the buffered box still composes — keep the escape hatch tappable (#6713).
              disabled={!canCompose}
              onPress={toggleLiveInput}
              accessibilityLabel={
                liveInputEnabled
                  ? 'Switch to buffered command input'
                  : 'Switch to live terminal input'
              }
            >
              <ChevronsRight
                size={14}
                color={
                  liveInputEnabled
                    ? colors.bgBase
                    : canCompose
                      ? colors.textSecondary
                      : colors.textMuted
                }
              />
            </Pressable>
            {canPaste && (
              <Pressable
                style={({ pressed }) => [
                  styles.accessoryKey,
                  pressed && styles.accessoryKeyPressed,
                  !canSend && styles.accessoryKeyDisabled
                ]}
                disabled={!canSend}
                onPress={() => void handlePaste()}
                accessibilityLabel="Paste from clipboard"
              >
                <Text
                  style={[styles.accessoryKeyText, !canSend && styles.accessoryKeyTextDisabled]}
                >
                  Paste
                </Text>
              </Pressable>
            )}
            {visibleBuiltInAccessoryKeys.map((key) => (
              <Pressable
                key={key.id}
                style={({ pressed }) => [
                  styles.accessoryKey,
                  pressed && styles.accessoryKeyPressed,
                  !canSend && styles.accessoryKeyDisabled
                ]}
                disabled={!canSend}
                onPressIn={() => {
                  if (!key.repeatable) {
                    return
                  }
                  const input = createTerminalLiveAccessoryInput(key)
                  void handleAccessoryKey(input)
                  startAccessoryRepeat(input)
                }}
                onPressOut={() => {
                  if (key.repeatable) {
                    stopAccessoryRepeat()
                  }
                }}
                onPress={() => {
                  if (key.repeatable) {
                    return
                  }
                  void handleAccessoryKey(createTerminalLiveAccessoryInput(key))
                }}
                accessibilityLabel={key.accessibilityLabel ?? `Send ${key.label}`}
              >
                <Text
                  style={[styles.accessoryKeyText, !canSend && styles.accessoryKeyTextDisabled]}
                >
                  {key.label}
                </Text>
              </Pressable>
            ))}
            {customKeys.map((key) => (
              <Pressable
                key={key.id}
                style={({ pressed }) => [
                  styles.accessoryKey,
                  styles.customAccessoryKey,
                  pressed && styles.accessoryKeyPressed,
                  !canSend && styles.accessoryKeyDisabled
                ]}
                disabled={!canSend}
                onPress={() => void handleAccessoryKey({ bytes: key.bytes })}
                onLongPress={() => {
                  triggerMediumImpact()
                  setDeleteKeyTarget(key)
                }}
                delayLongPress={400}
                accessibilityLabel={`Send ${key.label}`}
              >
                <Text
                  style={[styles.accessoryKeyText, !canSend && styles.accessoryKeyTextDisabled]}
                >
                  {key.label}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={({ pressed }) => [styles.accessoryKey, pressed && styles.accessoryKeyPressed]}
              onPress={() => setShowCustomKeyModal(true)}
              accessibilityLabel="Add custom shortcut"
            >
              <Plus size={14} color={colors.textSecondary} strokeWidth={2.2} />
            </Pressable>
          </ScrollView>
        </View>

        {/* Input bar */}
        {liveInputEnabled ? (
          <View style={[styles.inputBar, styles.liveInputBar]}>
            <Pressable
              style={({ pressed }) => [
                styles.liveInputFocusTarget,
                pressed && styles.liveInputFocusTargetPressed,
                !canSend && styles.liveInputFocusTargetDisabled
              ]}
              disabled={!canSend}
              onPress={focusLiveInput}
              accessibilityRole="button"
              accessibilityLabel="Show keyboard for live terminal input"
              accessibilityHint="Typed text is sent directly to the active terminal"
            >
              <KeyboardIcon size={16} color={colors.textSecondary} strokeWidth={2} />
              <MobileTerminalLiveInputStatus
                dictation={dictation}
                isAttaching={isAttaching}
                liveInputText={liveInputCapture}
              />
            </Pressable>
            <MobileTerminalInputActions
              canSend={canSend}
              isAttaching={isAttaching}
              dictation={dictation}
              dictationMode={dictationMode}
              buttonStyle={styles.dictationButton}
              activeButtonStyle={styles.dictationButtonActive}
              disabledButtonStyle={styles.sendButtonDisabled}
              onAttachImage={() => void attachImage('library')}
              onAttachFile={() => void attachImage('files')}
              onDictationToggle={handleDictationToggle}
              onDictationPressIn={handleDictationPressIn}
              onDictationPressOut={handleDictationPressOut}
              onDictationCancel={cancelDictation}
            />
            <TextInput
              ref={liveInputRef}
              style={styles.liveInputCapture}
              value={liveInputCapture}
              onChange={handleLiveInputChange}
              onKeyPress={handleLiveInputKeyPress}
              onSubmitEditing={() => {
                const submit = handleLiveInputSubmit()
                const sendOrigin = {
                  tab: activeSessionTab,
                  generation: getSendCompletionGeneration(),
                  interaction: getLiveInteractionGeneration()
                }
                void submit.then((accepted) =>
                  dismissKeyboardAfterAgentSend(
                    sendOrigin,
                    accepted && sendOrigin.interaction === getLiveInteractionGeneration()
                  )
                )
              }}
              placeholder=""
              showSoftInputOnFocus
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              smartInsertDelete={false}
              // Why: iOS textContentType overrides autoComplete and can narrow the keyboard; keep IME switching available.
              autoComplete="off"
              keyboardType={getTerminalLiveInputKeyboardType(Platform.OS)}
              returnKeyType="default"
              blurOnSubmit={false}
              // Why: editable={canSend} also tracked the active handle, so a
              // lagging tab snapshot resigned first responder and closed the
              // keyboard mid-typing. Sends stay gated on canSend.
              editable={canHoldLiveKeyboard}
              importantForAutofill="no"
            />
          </View>
        ) : (
          <MobileTerminalCommandComposer
            controller={controller}
            expanded={expandedComposer}
            onToggleExpanded={() => setComposerExpanded((current) => !current)}
          />
        )}
      </View>
    )
  )
}
