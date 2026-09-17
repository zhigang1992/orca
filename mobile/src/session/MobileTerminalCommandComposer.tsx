import { View, TextInput, Pressable, Platform } from 'react-native'
import { ArrowUp, ChevronDown, ChevronUp } from 'lucide-react-native'
import { getTerminalCommandKeyboardType } from '../terminal/terminal-keyboard-type'
import { MobileTerminalInputActions } from './MobileTerminalInputActions'
import { colors } from '../theme/mobile-theme'
import { styles } from './mobile-session-styles'
import type { MobileSessionController } from './use-mobile-session-controller'

type MobileTerminalCommandComposerProps = {
  readonly controller: MobileSessionController
  readonly expanded: boolean
  readonly onToggleExpanded: () => void
}

/** The buffered "Type a command…" bar: a local draft sent on Return or the send
 *  button, which can expand over the terminal so long dictated text is readable. */
export function MobileTerminalCommandComposer({
  controller,
  expanded,
  onToggleExpanded
}: MobileTerminalCommandComposerProps) {
  const {
    autocompleteEnabled,
    bufferedTerminalDraftState,
    commandInputRef,
    canSend,
    canCompose,
    dictation,
    dictationMode,
    cancelDictation,
    handleDictationToggle,
    handleDictationPressIn,
    handleDictationPressOut,
    handleSend,
    isAttaching,
    attachImage
  } = controller
  return (
    <View style={[styles.inputBar, expanded && styles.inputBarExpanded]}>
      <TextInput
        ref={commandInputRef}
        // Why: Android caches IME inputType at mount, so toggling autocomplete must remount there; iOS updates in place.
        key={
          Platform.OS === 'android'
            ? autocompleteEnabled
              ? 'cmd-input-ac-on'
              : 'cmd-input-ac-off'
            : 'cmd-input'
        }
        style={[styles.textInput, expanded && styles.textInputExpanded]}
        value={bufferedTerminalDraftState.input}
        // Why: iOS kills active dictation/IME if JS writes a value differing from native text; store raw, normalize at send.
        onChangeText={bufferedTerminalDraftState.setInput}
        placeholder="Type a command…"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={autocompleteEnabled}
        spellCheck={autocompleteEnabled}
        smartInsertDelete={false}
        // Why: not autofill content, but keyboard must stay default so non-Latin IMEs remain selectable.
        autoComplete="off"
        keyboardType={getTerminalCommandKeyboardType(Platform.OS, autocompleteEnabled)}
        returnKeyType="send"
        // Why submitBehavior rather than the deprecated blur-on-submit flag: the
        // field is multiline so the box can grow without a native remount, and on a
        // multiline field Return defaults to inserting a newline. "submit" keeps
        // Return sending and still never blurs, so the explicit accepted-agent
        // dismissal stays the only thing that drops the keyboard.
        multiline
        submitBehavior="submit"
        // Why: composing is local — an outage must not lock the field or discard typed text (#6713).
        editable={canCompose}
        onSubmitEditing={() => void handleSend()}
      />
      <Pressable
        style={({ pressed }) => [
          styles.expandKey,
          pressed && styles.accessoryKeyPressed,
          !canCompose && styles.accessoryKeyDisabled
        ]}
        disabled={!canCompose}
        onPress={onToggleExpanded}
        accessibilityLabel={expanded ? 'Collapse the command box' : 'Expand the command box'}
        accessibilityHint="Shows more of what you have typed or dictated"
      >
        {expanded ? (
          <ChevronDown size={16} color={colors.textSecondary} strokeWidth={2.2} />
        ) : (
          <ChevronUp size={16} color={colors.textSecondary} strokeWidth={2.2} />
        )}
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
      <Pressable
        style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
        disabled={!canSend}
        onPress={() => void handleSend()}
        accessibilityLabel="Send command"
      >
        <ArrowUp size={18} color={colors.textSecondary} strokeWidth={2.5} />
      </Pressable>
    </View>
  )
}
