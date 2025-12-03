// Utilities to parse mentions and hashtags. Return an array of parts { type, text, meta }

export function parseHashtags(text) {
  const parts = [];
  const re = /#(\w+)/g;
+  let lastIndex = 0;
+  let m;
+  while ((m = re.exec(text))) {
+    if (m.index > lastIndex) parts.push({ type: 'text', text: text.slice(lastIndex, m.index) });
+    parts.push({ type: 'hashtag', text: m[0], tag: m[1] });
+    lastIndex = re.lastIndex;
+  }
+  if (lastIndex < text.length) parts.push({ type: 'text', text: text.slice(lastIndex) });
+  return parts;
 }
 
 export function parseMentions(text) {
-  const re = /@(\w+)/g;
-  const matches = [];
-  let m;
-  while ((m = re.exec(text))) {
-    matches.push({ index: m.index, username: m[1] });
-  }
-  return matches;
+  const parts = [];
+  const re = /@(\w+)/g;
+  let lastIndex = 0;
+  let m;
+  while ((m = re.exec(text))) {
+    if (m.index > lastIndex) parts.push({ type: 'text', text: text.slice(lastIndex, m.index) });
+    parts.push({ type: 'mention', text: m[0], username: m[1] });
+    lastIndex = re.lastIndex;
+  }
+  if (lastIndex < text.length) parts.push({ type: 'text', text: text.slice(lastIndex) });
+  return parts;
 }
*** End Patch