import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../../theme';

interface EditableFieldProps {
  label: string;
  value: string | string[] | number | undefined;
  onSave: (newValue: string | string[] | number) => Promise<void>;
  multiline?: boolean;
  isArray?: boolean;
  isNumber?: boolean;
}

function EditableFieldComponent({ label, value, onSave, multiline, isArray, isNumber }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const displayValue = isArray
    ? (value as string[] | undefined)?.join(', ') || ''
    : String(value ?? '');

  const startEdit = useCallback(() => {
    if (isArray) {
      setDraft((value as string[] | undefined)?.join('\n') || '');
    } else {
      setDraft(String(value ?? ''));
    }
    setValidationError(null);
    setEditing(true);
  }, [value, isArray]);

  const cancel = useCallback(() => {
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
        parsed = trimmed === '' ? 0 : num;
      } else {
        parsed = trimmed;
      }
      setDraft(isArray ? draft : trimmed);
      await onSave(parsed);
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
        style={styles.field}
        onPress={startEdit}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${displayValue || 'empty'}. Tap to edit`}
        accessibilityHint="Double tap to edit this field"
      >
        <View style={styles.fieldHeader}>
          <Text style={styles.label}>{label}</Text>
          <Ionicons name="pencil-outline" size={14} color={colors.textTertiary} />
        </View>
        <Text style={styles.value} numberOfLines={multiline || isArray ? 4 : 1}>
          {displayValue || '—'}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {isArray && (
        <Text style={styles.hint}>One item per line</Text>
      )}
      <TextInput
        style={[
          styles.input,
          (multiline || isArray) && styles.inputMultiline,
          validationError ? styles.inputError : undefined,
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
        <Text style={styles.errorText}>{validationError}</Text>
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
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={save}
              style={[styles.actionBtn, styles.saveBtn]}
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
    borderBottomColor: colors.border,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  input: {
    fontSize: fontSize.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    backgroundColor: colors.white,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  cancelText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
  saveText: {
    fontSize: fontSize.sm,
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
});
