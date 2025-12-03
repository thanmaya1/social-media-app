import React from 'react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

export default function EmojiPicker({ onSelect }) {
  // Using emoji-mart Picker with categories and skin tone support.
  // Picker props: data, onEmojiSelect. The emoji object has `native` property.
  return (
    <div className="emoji-picker">
      <Picker
        data={data}
        onEmojiSelect={(emoji) => onSelect && onSelect(emoji.native || emoji.colons || emoji)}
        previewPosition="bottom"
        perLine={8}
        emojiSize={20}
        theme="light"
      />
    </div>
  );
}
