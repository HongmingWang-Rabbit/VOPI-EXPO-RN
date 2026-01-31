import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { haptics } from '../../utils/haptics';
import { spacing, borderRadius, fontSize, fontWeight } from '../../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface EditableFieldProps {
  label: string;
  value: string | string[] | number | undefined;
  onSave: (newValue: string | string[] | number) => Promise<void>;
  multiline?: boolean;
  isArray?: boolean;
  isNumber?: boolean;
}

function EditableFieldComponent({ label, value, onSave, multiline, isArray, isNumber }: EditableFieldProps) {
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const displayValue = isArray
    ? (value as string[] | undefined)?.join(', ') || ''
    : String(value ?? '');

  const startEdit = useCallback(() => {
    haptics.selection();
    if (isArray) {
      setDraft((value as string[] | undefined)?.join('\n') || '');
    } else {
      setDraft(String(value ?? ''));
    }
    setValidationError(null);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditing(true);
  }, [value, isArray]);

  const cancel = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setEditing(false);
    setValidationError(null);
  }, []);

  const save = useCallback(async () => {
    setValidationError(null);
    setSaving(true);
    try {
      let parsed: string | string[] | number;
      const trimmed = draft.trim();
      if (isArray) {
        parsed = draft.split('\n').map((s) => s.trim()).filter(Boolean);
      } else if (isNumber) {
        const num = parseFloat(trimmed);
        if (trimmed !== '' && isNaN(num)) {
          setValidationError('Please enter a valid number');
          setSaving(false);
          return;
        }
        parsed = trimmed === '' ? '' : num;
      } else {
        parsed = trimmed;
      }
      setDraft(isArray ? draft : trimmed);
      await onSave(parsed);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setEditing(false);
    } catch {
      // Keep editing open on error — parent shows Alert
    } finally {
      setSaving(false);
    }
  }, [draft, onSave, isArray, isNumber]);

  if (!editing) {
    return (
      <TouchableOpacity
        style={[styles.field, { borderBottomColor: colors.border, minHeight: 48 }]}
        onPress={startEdit}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${displayValue || 'empty'}. Tap to edit`}
        accessibilityHint="Double tap to edit this field"
      >
        <View style={styles.fieldHeader}>
          <Text style={[styles.label, { color: colors.textTertiary }]}>{label}</Text>
          <Ionicons name="pencil-outline" size={14} color={colors.textTertiary} />
        </View>
        <Text style={[styles.value, { color: colors.text }]} numberOfLines={multiline || isArray ? 4 : 1}>
          {displayValue || '\u2014'}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.field, { borderBottomColor: colors.border, backgroundColor: colors.primaryBackground, marginHorizontal: -spacing.md, paddingHorizontal: spacing.md, borderRadius: borderRadius.md }]}>
      <Text style={[styles.label, { color: colors.textTertiary }]}>{label}</Text>
      {isArray && (
        <Text style={[styles.hint, { color: colors.textTertiary }]}>One item per line</Text>
      )}
      <TextInput
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.primaryLight, backgroundColor: colors.background },
          (multiline || isArray) && styles.inputMultiline,
          validationError ? { borderColor: colors.error } : undefined,
        ]}
        value={draft}
        onChangeText={(text) => {
          setDraft(text);
          if (validationError) setValidationError(null);
        }}
        multiline={multiline || isArray}
        autoFocus
        editable={!saving}
        keyboardType={isNumber ? 'decimal-pad' : 'default'}
        accessibilityLabel={`Edit ${label}`}
        accessibilityHint={isArray ? 'Enter one item per line' : undefined}
      />
      {validationError && (
        <Text style={[styles.errorText, { color: colors.error }]}>{validationError}</Text>
      )}
      <View style={styles.actions}>
        {saving ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <TouchableOpacity
              onPress={cancel}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel={`Cancel editing ${label}`}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={save}
              style={[styles.actionBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel={`Save ${label}`}
            >
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

export const EditableField = memo(EditableFieldComponent);

const styles = StyleSheet.create({
  field: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: fontSize.xs,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  input: {
    fontSize: fontSize.sm,
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    minHeight: 48,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  actionBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  cancelText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  saveText: {
    fontSize: fontSize.sm,
    color: '#FFFFFF',
    fontWeight: fontWeight.medium,
  },
});
