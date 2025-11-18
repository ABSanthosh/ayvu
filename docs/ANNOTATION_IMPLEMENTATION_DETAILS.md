# Annotation System - Complete Technical Implementation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Layer](#database-layer)
4. [State Management](#state-management)
5. [Frontend Components](#frontend-components)
6. [Text Selection & Highlighting](#text-selection--highlighting)
7. [Server Actions](#server-actions)
8. [User Interaction Flow](#user-interaction-flow)
9. [Technical Deep Dive](#technical-deep-dive)
10. [Files Changed](#files-changed)

---

## Overview

The annotation system allows users to select text in research papers, highlight it with customizable colors, and attach notes. The implementation uses:
- **SvelteKit** for the full-stack framework
- **Drizzle ORM** with SQLite for data persistence
- **Svelte 5 Runes** for reactive state management
- **Form Actions** for progressive enhancement
- **DOM Range API** for text selection and manipulation

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface Layer                    │
├─────────────────────────────────────────────────────────────┤
│  AnnotationPopup.svelte  │  Paper Page (+page@[id].svelte) │
│  - Color picker           │  - Text selection handlers      │
│  - Note input             │  - Highlight rendering          │
│  - Position calculation   │  - Context menus                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    State Management Layer                    │
├─────────────────────────────────────────────────────────────┤
│              AnnotationStore.ts (Svelte Store)              │
│  - annotations: AnnotationData[]                            │
│  - activeAnnotationId: string | null                        │
│  - isCreating: boolean                                      │
│  + setAnnotations, addAnnotation, updateAnnotation, etc.   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Server Action Layer                       │
├─────────────────────────────────────────────────────────────┤
│            +page.server.ts (SvelteKit Actions)              │
│  - createAnnotation: Creates new annotation in DB           │
│  - updateAnnotation: Updates existing annotation            │
│  - deleteAnnotation: Removes annotation from DB             │
│  - load: Loads all annotations for a paper                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Database Layer                           │
├─────────────────────────────────────────────────────────────┤
│         Annotation.db.ts (Drizzle ORM Operations)           │
│  - createAnnotation(data)                                   │
│  - getAnnotationsByPaperId(paperId, userId)                 │
│  - updateAnnotation(id, updates)                            │
│  - deleteAnnotation(id)                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Schema                           │
├─────────────────────────────────────────────────────────────┤
│               Annotation.schema.ts (SQLite)                 │
│  Table: annotations                                         │
│  - id (TEXT, PRIMARY KEY)                                   │
│  - paperId (TEXT)                                           │
│  - userId (TEXT)                                            │
│  - selectedText (TEXT)                                      │
│  - anchorText (TEXT)                                        │
│  - note (TEXT, nullable)                                    │
│  - highlightColor (TEXT, default: '#ffeb3b')                │
│  - startOffset (INTEGER)                                    │
│  - endOffset (INTEGER)                                      │
│  - createdAt (TEXT, ISO timestamp)                          │
│  - updatedAt (TEXT, ISO timestamp)                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Layer

### Schema Definition (`src/lib/db/schema/Annotation.schema.ts`)

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const Annotation = sqliteTable('annotations', {
  id: text().primaryKey().notNull(),
  paperId: text().notNull(),
  userId: text().notNull(),
  selectedText: text().notNull(),
  anchorText: text().notNull(), // Text around selection for anchoring
  note: text(), // User's note/comment
  highlightColor: text().default('#ffeb3b'), // Color for highlight
  startOffset: integer().notNull(), // Character offset in the document
  endOffset: integer().notNull(), // Character offset in the document
  createdAt: text().notNull(),
  updatedAt: text().notNull()
});
```

**Field Purposes:**
- `id`: Unique identifier generated using `nanoid()`
- `paperId`: Links annotation to specific paper (folder ID in Google Drive)
- `userId`: Links annotation to the user who created it
- `selectedText`: The exact text that was highlighted
- `anchorText`: 50 characters before and after the selection for text anchoring
- `note`: Optional user note attached to the highlight
- `highlightColor`: Hex color code for the highlight (5 preset colors available)
- `startOffset`: Character position where selection starts in the text node
- `endOffset`: Character position where selection ends in the text node
- `createdAt`: ISO timestamp of creation
- `updatedAt`: ISO timestamp of last update

### Database Operations (`src/lib/db/Annotation.db.ts`)

```typescript
export interface AnnotationData {
  id: string;
  paperId: string;
  userId: string;
  selectedText: string;
  anchorText: string;
  note: string | null;
  highlightColor: string | null;
  startOffset: number;
  endOffset: number;
  createdAt: string;
  updatedAt: string;
}
```

**Key Functions:**

1. **`createAnnotation(data: AnnotationData)`**
   - Inserts a new annotation into the database
   - Logs the creation data for debugging
   - Returns the database insertion result

2. **`getAnnotationsByPaperId(paperId: string, userId: string)`**
   - Fetches all annotations for a specific paper and user
   - Uses AND clause to filter by both paperId and userId
   - Returns array of AnnotationData

3. **`updateAnnotation(id: string, updates: Partial<AnnotationData>)`**
   - Updates specific fields of an annotation
   - Automatically updates the `updatedAt` timestamp
   - Uses the annotation ID for targeting

4. **`deleteAnnotation(id: string)`**
   - Removes an annotation from the database
   - Uses the annotation ID for targeting

5. **`deleteAnnotationsByPaperId(paperId: string, userId: string)`**
   - Bulk delete operation for all annotations of a paper
   - Filtered by both paperId and userId for safety

---

## State Management

### Annotation Store (`src/lib/stores/AnnotationStore.ts`)

The store manages the client-side state of annotations using Svelte's writable store:

```typescript
export interface AnnotationStore {
  annotations: AnnotationData[];
  activeAnnotationId: string | null;
  isCreating: boolean;
}
```

**Store Methods:**

1. **`setAnnotations(annotations: AnnotationData[])`**
   - Replaces the entire annotations array
   - Used when initially loading annotations from the server

2. **`addAnnotation(annotation: AnnotationData)`**
   - Appends a new annotation to the array
   - Called after successful creation on server

3. **`updateAnnotation(id: string, updates: Partial<AnnotationData>)`**
   - Updates specific fields of an annotation in the store
   - Uses map to create a new array with the updated annotation

4. **`removeAnnotation(id: string)`**
   - Filters out the deleted annotation
   - Called after successful deletion on server

5. **`setActiveAnnotation(id: string | null)`**
   - Tracks which annotation is currently active/selected
   - Used for UI highlighting and focus management

6. **`setIsCreating(isCreating: boolean)`**
   - Tracks whether the user is currently creating an annotation
   - Used to prevent multiple simultaneous creations

7. **`reset()`**
   - Clears all state
   - Used when navigating away from a paper

**Usage Pattern:**
```typescript
import { annotationStore } from '$lib/stores/AnnotationStore';

// Subscribe to changes
const unsubscribe = annotationStore.subscribe((store) => {
  annotations = store.annotations;
});

// Update store
annotationStore.addAnnotation(newAnnotation);
```

---

## Frontend Components

### 1. AnnotationPopup Component (`src/lib/components/AnnotationPopup.svelte`)

**Purpose:** Shows a popup when user selects text, allowing them to choose a highlight color and add a note.

**Props:**
```typescript
{
  paperId: string;
  onSave: (data: {...}) => void;
  onCancel: () => void;
}
```

**Internal State:**
```typescript
let position = $state({ x: 0, y: 0 });         // Popup position
let note = $state('');                          // User's note text
let highlightColor = $state('#ffeb3b');         // Selected color
let selectedText = $state('');                  // The selected text
let anchorText = $state('');                    // Context around selection
let startOffset = $state(0);                    // Selection start position
let endOffset = $state(0);                      // Selection end position
let popupElement = $state<HTMLDivElement>();    // Reference to popup DOM element
```

**Key Features:**

1. **Text Anchoring:**
```typescript
export function show(selection: Selection, rect: DOMRect) {
  selectedText = selection.toString().trim();
  
  // Get surrounding context for anchoring (50 chars before and after)
  const range = selection.getRangeAt(0);
  const textContent = range.commonAncestorContainer.textContent || '';
  const selectionStart = range.startOffset;
  const selectionEnd = range.endOffset;
  
  const contextStart = Math.max(0, selectionStart - 50);
  const contextEnd = Math.min(textContent.length, selectionEnd + 50);
  anchorText = textContent.substring(contextStart, contextEnd);
  
  startOffset = selectionStart;
  endOffset = selectionEnd;
}
```

This captures 50 characters before and after the selection to help relocate the text even if the document structure changes slightly.

2. **Smart Positioning:**
```typescript
$effect(() => {
  if (popupElement) {
    const rect = popupElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust horizontal position if off-screen
    if (position.x + rect.width / 2 > viewportWidth) {
      position.x = viewportWidth - rect.width / 2 - 10;
    }
    if (position.x - rect.width / 2 < 0) {
      position.x = rect.width / 2 + 10;
    }

    // Adjust vertical position if off-screen
    if (position.y - rect.height < 0) {
      position.y = position.y + rect.height + 30; // Show below selection
    }
  }
});
```

The popup automatically adjusts its position to stay within the viewport boundaries.

3. **Color Palette:**
```typescript
const colors = [
  { name: 'Yellow', value: '#ffeb3b' },
  { name: 'Green', value: '#4caf50' },
  { name: 'Blue', value: '#2196f3' },
  { name: 'Pink', value: '#e91e63' },
  { name: 'Purple', value: '#9c27b0' }
];
```

Users can choose from 5 preset colors, with visual feedback showing the active color.

4. **Two Save Options:**
- **Highlight Only:** Creates annotation without a note
- **Save Note:** Creates annotation with the entered note

Both options call `onSave()` with the annotation data, which triggers a form submission to the server.

**Styling Highlights:**
- Popup appears above selection with an arrow pointing down
- Arrow automatically flips if popup is below selection
- Smooth transitions and hover effects on color buttons
- BEM-style SCSS for maintainable styling

---

### 2. Paper Page Integration (`src/routes/(app)/app/paper/[id]/+page@[id].svelte`)

This is where the annotation system is integrated into the paper viewer.

**Key State Variables:**
```typescript
let annotations = $state<any[]>([]);                          // All annotations
let showAnnotationPopup = $state(false);                      // Show/hide popup
let annotationPopupComponent = $state<any>(null);             // Popup component ref
let paperContentElement = $state<HTMLDivElement>();           // Paper container ref
let showContextMenu = $state(false);                          // Right-click menu
let contextMenuPosition = $state({ x: 0, y: 0 });             // Menu position
let contextMenuAnnotation = $state<any>(null);                // Selected annotation
let showAnnotationView = $state(false);                       // View annotation popup
let viewAnnotationPosition = $state({ x: 0, y: 0 });          // View popup position
let viewAnnotation = $state<any>(null);                       // Annotation being viewed
```

**Initialization:**
```typescript
onMount(() => {
  if (data.annotations) {
    annotationStore.setAnnotations(data.annotations);
  }

  const unsubscribe = annotationStore.subscribe((store) => {
    annotations = store.annotations;
  });

  return unsubscribe;
});
```

Loads annotations from server data on mount and subscribes to store changes.

---

## Text Selection & Highlighting

### Selection Detection

**Mouse Event Handlers:**
```typescript
// Detect text selection
function handleSelection() {
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    const text = selection.toString().trim();
    if (text) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      currentSelection = selection;
      showAnnotationPopup = true;

      // Show the popup component
      if (annotationPopupComponent) {
        annotationPopupComponent.show(selection, rect);
      }

      selectedText = text;
    }
  } else if (selection && (selection.rangeCount === 0 || selection.isCollapsed)) {
    selectedText = '';
    showAnnotationPopup = false;
  }
}

// Clear selection when starting new one
function handleMouseDown() {
  const selection = window.getSelection();
  if (selection && selection.toString().trim() === '') {
    selectedText = '';
    showAnnotationPopup = false;
  }
}
```

These handlers are attached to the paper content element:
```html
<div
  class="paper-content"
  bind:this={paperContentElement}
  onmouseup={handleSelection}
  onmousedown={handleMouseDown}
  oncontextmenu={handleHighlightContextMenu}
>
```

### Highlight Rendering

**The `applyHighlights()` Function:**

This is the core function that renders highlights in the document:

```typescript
function applyHighlights() {
  if (!paperContentElement) return;
  if (annotations.length === 0) return;

  // Step 1: Remove existing highlights
  const existingHighlights = paperContentElement.querySelectorAll('mark.text-highlight');
  existingHighlights.forEach((el) => {
    const parent = el.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(el.textContent || ''), el);
      parent.normalize(); // Merge adjacent text nodes
    }
  });

  // Step 2: Find all paragraph elements that might contain text
  const paragraphs = paperContentElement.querySelectorAll(
    'p, div.ltx_para, span, h1, h2, h3, h4, h5, h6'
  );

  // Step 3: Apply each annotation
  for (const annotation of annotations) {
    let found = false;

    // Try to find the text in each paragraph
    for (const para of paragraphs) {
      if (found) break;

      const textContent = para.textContent || '';
      const index = textContent.indexOf(annotation.selectedText);

      if (index !== -1) {
        // Use a tree walker to find the exact text node
        const walker = document.createTreeWalker(
          para, 
          NodeFilter.SHOW_TEXT, 
          null
        );

        let currentOffset = 0;
        let node: Node | null;

        while ((node = walker.nextNode())) {
          const textNode = node as Text;
          const nodeLength = textNode.length;
          const nodeStart = currentOffset;
          const nodeEnd = currentOffset + nodeLength;

          // Check if annotation starts in this text node
          if (index >= nodeStart && index < nodeEnd) {
            const startInNode = index - nodeStart;
            const endInNode = Math.min(
              startInNode + annotation.selectedText.length, 
              nodeLength
            );

            try {
              const range = document.createRange();
              range.setStart(textNode, startInNode);
              range.setEnd(textNode, endInNode);

              const highlight = document.createElement('mark');
              highlight.className = 'text-highlight';
              const bgColor = annotation.highlightColor || '#ffeb3b';
              highlight.style.backgroundColor = bgColor;
              highlight.style.color = getContrastColor(bgColor);
              highlight.setAttribute('data-annotation-id', annotation.id);
              highlight.setAttribute('title', annotation.note || 'Click to view note');

              range.surroundContents(highlight);
              found = true;
              break;
            } catch (e) {
              console.warn('Could not apply highlight:', e);
            }
          }

          currentOffset += nodeLength;
        }
      }
    }
  }
}
```

**How it works:**

1. **Clean Up:** Removes all existing `<mark>` elements and normalizes text nodes
2. **Find Paragraphs:** Queries for all elements that might contain text
3. **Locate Text:** For each annotation, finds the paragraph containing the selected text
4. **Tree Walker:** Uses `TreeWalker` API to iterate through text nodes precisely
5. **Calculate Offsets:** Tracks character positions to find the exact text node and offset
6. **Create Highlight:** Uses `Range.surroundContents()` to wrap text in a `<mark>` element
7. **Style Highlight:** Applies background color and contrasting text color
8. **Add Metadata:** Stores annotation ID as data attribute for click handling

**Reactive Re-application:**
```typescript
$effect(() => {
  if (paperContentElement && annotations.length > 0) {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      applyHighlights();
      attachHighlightClickHandlers();
    }, 100);
  }
});
```

Highlights are automatically re-applied whenever the annotations array changes.

### Contrast Color Calculation

Ensures text is readable on any highlight color:

```typescript
function getContrastColor(hexColor: string): string {
  // Convert hex to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return dark text for light backgrounds, light text for dark backgrounds
  return luminance > 0.5 ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.95)';
}
```

Uses the relative luminance formula to determine if the background is light or dark.

### Highlight Click Handling

**Attaching Click Listeners:**
```typescript
function attachHighlightClickHandlers() {
  if (!paperContentElement) return;

  const highlights = paperContentElement.querySelectorAll('mark.text-highlight');
  highlights.forEach((highlight) => {
    highlight.addEventListener('click', handleHighlightClick);
  });
}

function handleHighlightClick(event: Event) {
  event.stopPropagation();
  const target = event.target as HTMLElement;
  const annotationId = target.getAttribute('data-annotation-id');
  const annotation = annotations.find((a) => a.id === annotationId);

  if (annotation) {
    const rect = target.getBoundingClientRect();
    viewAnnotation = annotation;

    // Position below the highlight
    viewAnnotationPosition = {
      x: rect.left + rect.width / 2,
      y: rect.bottom + window.scrollY + 10
    };
    showAnnotationView = true;
  }
}
```

Clicking a highlight shows a popup with the annotation details.

### Context Menu (Right-Click)

**Right-Click Handler:**
```typescript
function handleHighlightContextMenu(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (target.classList.contains('text-highlight')) {
    event.preventDefault();
    const annotationId = target.getAttribute('data-annotation-id');
    const annotation = annotations.find((a) => a.id === annotationId);

    if (annotation) {
      contextMenuAnnotation = annotation;

      // Adjust position to keep menu on screen
      const menuWidth = 350;
      const menuHeight = 200;
      let x = event.clientX;
      let y = event.clientY;

      if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10;
      }
      if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 10;
      }

      contextMenuPosition = { x, y };
      showContextMenu = true;
    }
  }
}
```

Right-clicking a highlight shows a context menu with options to edit or delete.

---

## Server Actions

### Server-Side Operations (`src/routes/(app)/app/paper/[id]/+page.server.ts`)

**Loading Annotations:**
```typescript
export const load: PageServerLoad = async ({ params, parent }) => {
  const { user } = await parent();

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  try {
    // ... other code ...

    // Load annotations for this paper
    const annotations = await getAnnotationsByPaperId(params.id, user.googleId);

    return {
      paperId: params.id,
      htmlContent: cleanedHtmlContent,
      abstract,
      toc,
      annotations  // ← Returned to the client
    };
  } catch (err) {
    // Error handling
  }
};
```

Annotations are loaded during SSR and sent to the client with the initial page load.

**Form Actions:**

1. **Create Annotation:**
```typescript
createAnnotation: async ({ request, params, locals }) => {
  const { user } = locals;

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  const data = await request.formData();
  const selectedText = data.get('selectedText') as string;
  const anchorText = data.get('anchorText') as string;
  const note = data.get('note') as string;
  const highlightColor = data.get('highlightColor') as string;
  const startOffset = parseInt(data.get('startOffset') as string);
  const endOffset = parseInt(data.get('endOffset') as string);

  if (!selectedText || !anchorText) {
    throw error(400, 'Selected text and anchor text are required');
  }

  const now = new Date().toISOString();
  const annotation = {
    id: nanoid(),
    paperId: params.id!,
    userId: user.googleId,
    selectedText,
    anchorText,
    note: note || '',
    highlightColor: highlightColor || '#ffeb3b',
    startOffset,
    endOffset,
    createdAt: now,
    updatedAt: now
  };

  await createAnnotation(annotation);

  return { success: true, annotation };
}
```

2. **Update Annotation:**
```typescript
updateAnnotation: async ({ request, locals }) => {
  const { user } = locals;

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  const data = await request.formData();
  const id = data.get('id') as string;
  const note = data.get('note') as string;

  if (!id) {
    throw error(400, 'Annotation ID is required');
  }

  await updateAnnotation(id, { note });

  return { success: true };
}
```

3. **Delete Annotation:**
```typescript
deleteAnnotation: async ({ request, locals }) => {
  const { user } = locals;

  if (!user) {
    throw error(401, 'Unauthorized');
  }

  const data = await request.formData();
  const id = data.get('id') as string;

  if (!id) {
    throw error(400, 'Annotation ID is required');
  }

  await deleteAnnotation(id);

  return { success: true };
}
```

---

## User Interaction Flow

### Creating an Annotation

**Step-by-Step Process:**

1. **User selects text** in the paper
   - `onmouseup` event fires on paper-content element
   - `handleSelection()` is called

2. **Selection is validated**
   ```typescript
   const selection = window.getSelection();
   if (selection && !selection.isCollapsed) {
     const text = selection.toString().trim();
     if (text) {
       // Continue...
     }
   }
   ```

3. **AnnotationPopup appears**
   ```typescript
   const range = selection.getRangeAt(0);
   const rect = range.getBoundingClientRect();
   
   showAnnotationPopup = true;
   annotationPopupComponent.show(selection, rect);
   ```

4. **Popup extracts context**
   - Gets 50 characters before and after selection
   - Stores start/end offsets
   - Positions itself near the selection

5. **User chooses color and adds note (optional)**
   - Clicks on color buttons to select highlight color
   - Types note in textarea (optional)

6. **User clicks "Highlight Only" or "Save Note"**
   - `handleSave()` or `handleHighlightOnly()` is called
   - Calls `onSave()` callback with annotation data

7. **Parent component receives data**
   ```typescript
   function handleAnnotationSave(annotationData: any) {
     const annotationForm = document.getElementById('annotationForm') as HTMLFormElement;
     if (annotationForm) {
       // Set the input values
       (annotationForm.querySelector('input[name="selectedText"]') as HTMLInputElement).value =
         annotationData.selectedText;
       // ... set other fields ...
       
       annotationForm.requestSubmit();
     }
     showAnnotationPopup = false;
     window.getSelection()?.removeAllRanges();
   }
   ```

8. **Hidden form submits to server**
   ```html
   <form
     id="annotationForm"
     method="POST"
     action="?/createAnnotation"
     style="display: none;"
     use:enhance={() => {
       return async ({ update, result }) => {
         if (result.type === 'success') {
           const data = result.data as { annotation?: any };
           if (data?.annotation) {
             annotationStore.addAnnotation(data.annotation);
           }
         }
         await update();
       };
     }}
   >
   ```

9. **Server creates annotation**
   - Validates user authentication
   - Generates unique ID with `nanoid()`
   - Inserts into database via Drizzle ORM
   - Returns created annotation

10. **Client updates store**
    ```typescript
    annotationStore.addAnnotation(data.annotation);
    ```

11. **Reactive effect triggers**
    ```typescript
    $effect(() => {
      if (paperContentElement && annotations.length > 0) {
        setTimeout(() => {
          applyHighlights();
          attachHighlightClickHandlers();
        }, 100);
      }
    });
    ```

12. **Highlight appears in document**
    - `applyHighlights()` finds the text
    - Wraps it in `<mark>` element
    - Applies color and click handlers

### Viewing an Annotation

1. **User clicks on a highlight**
   - `handleHighlightClick()` is triggered
   - Annotation ID is extracted from `data-annotation-id` attribute

2. **Annotation data is retrieved**
   ```typescript
   const annotation = annotations.find((a) => a.id === annotationId);
   ```

3. **View popup appears**
   ```typescript
   viewAnnotation = annotation;
   viewAnnotationPosition = {
     x: rect.left + rect.width / 2,
     y: rect.bottom + window.scrollY + 10
   };
   showAnnotationView = true;
   ```

4. **Popup displays**
   - Highlight color indicator
   - Creation date
   - Note text (if any)
   - Edit and Delete buttons

### Editing an Annotation

1. **User clicks "Edit Note" in view popup**
   ```typescript
   function handleEditAnnotation() {
     if (viewAnnotation) {
       const note = prompt('Edit your note:', viewAnnotation.note || '');
       if (note !== null) {
         handleAnnotationUpdate(viewAnnotation.id, note);
       }
       closeAnnotationView();
     }
   }
   ```

2. **Update form submits**
   ```typescript
   async function handleAnnotationUpdate(id: string, note: string) {
     const updateForm = document.getElementById('updateAnnotationForm') as HTMLFormElement;
     if (updateForm) {
       (updateForm.querySelector('input[name="id"]') as HTMLInputElement).value = id;
       (updateForm.querySelector('input[name="note"]') as HTMLInputElement).value = note;
       updateForm.requestSubmit();
     }
   }
   ```

3. **Server updates annotation**
   - Updates `note` field
   - Updates `updatedAt` timestamp
   - Returns success

4. **Client updates store**
   ```typescript
   annotationStore.updateAnnotation(id, { note });
   ```

5. **Highlights are refreshed**
   - Reactive effect triggers
   - Highlights are re-rendered with updated data

### Deleting an Annotation

1. **User clicks "Delete" button**
   - In view popup or context menu

2. **Confirmation dialog**
   ```typescript
   if (viewAnnotation && confirm('Are you sure you want to delete this annotation?')) {
     handleAnnotationDelete(viewAnnotation.id);
     closeAnnotationView();
   }
   ```

3. **Delete form submits**
   ```typescript
   async function handleAnnotationDelete(id: string) {
     const deleteForm = document.getElementById('deleteAnnotationForm') as HTMLFormElement;
     if (deleteForm) {
       (deleteForm.querySelector('input[name="id"]') as HTMLInputElement).value = id;
       deleteForm.requestSubmit();
     }
   }
   ```

4. **Server deletes annotation**
   - Removes from database
   - Returns success

5. **Client updates store**
   ```typescript
   annotationStore.removeAnnotation(id);
   ```

6. **Highlight is removed**
   - Reactive effect triggers
   - `applyHighlights()` is called
   - Old highlights are cleared
   - New highlights (without deleted one) are rendered

---

## Technical Deep Dive

### Progressive Enhancement Pattern

The annotation system uses SvelteKit's form actions with `use:enhance` for progressive enhancement:

```html
<form
  id="annotationForm"
  method="POST"
  action="?/createAnnotation"
  style="display: none;"
  use:enhance={() => {
    return async ({ update, result }) => {
      if (result.type === 'success') {
        const data = result.data as { annotation?: any };
        if (data?.annotation) {
          annotationStore.addAnnotation(data.annotation);
        }
      }
      await update();
    };
  }}
>
```

**Benefits:**
- Works without JavaScript (graceful degradation)
- Prevents full page reload
- Allows custom handling of form results
- Updates UI optimistically or pessimistically

### DOM Manipulation Strategy

**Why TreeWalker?**

The `TreeWalker` API is used instead of simple string replacement because:

1. **Precision:** Handles text split across multiple text nodes
2. **Efficiency:** Avoids parsing entire DOM
3. **Safety:** Doesn't break existing HTML structure
4. **Accuracy:** Respects element boundaries

**Algorithm:**
```
For each annotation:
  1. Find paragraphs containing the text
  2. Create TreeWalker for text nodes
  3. Track character offset as we traverse
  4. When we find the right offset:
     a. Create a Range at that position
     b. Wrap Range in <mark> element
     c. Add styling and metadata
     d. Continue to next annotation
```

### Offset Calculation

**Character Offsets:**
- `startOffset` and `endOffset` are relative to the text node's content
- Not relative to the entire document
- Must be recalculated when walking the tree

**Why Not Use Document-Level Offsets?**
- HTML structure varies (nested elements, line breaks, etc.)
- Text nodes can be split or merged by the browser
- Anchor text provides fallback if exact offset fails

### Event Handling

**Click Outside Pattern:**
```typescript
$effect(() => {
  if (showAnnotationView) {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.annotation-view-popup') && !target.closest('.text-highlight')) {
        closeAnnotationView();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }
});
```

Uses Svelte 5's `$effect` to:
1. Add listener when popup shows
2. Check if click is outside popup/highlight
3. Clean up listener when popup closes or effect re-runs

**Why `stopPropagation` in Highlight Click?**
```typescript
function handleHighlightClick(event: Event) {
  event.stopPropagation();  // ← Prevents closing the popup
  // ... rest of handler
}
```

Prevents the document-level click listener from immediately closing the popup.

### Performance Considerations

**Debouncing Highlight Application:**
```typescript
setTimeout(() => {
  applyHighlights();
  attachHighlightClickHandlers();
}, 100);
```

Small delay ensures DOM is fully rendered before applying highlights.

**Single DOM Query:**
```typescript
const paragraphs = paperContentElement.querySelectorAll(
  'p, div.ltx_para, span, h1, h2, h3, h4, h5, h6'
);
```

Queries all potential text containers once, then iterates through them.

**Early Exit:**
```typescript
for (const para of paragraphs) {
  if (found) break;  // ← Stop searching once text is found
  // ...
}
```

Stops searching once the text is located.

### Error Handling

**Graceful Degradation:**
```typescript
try {
  const range = document.createRange();
  range.setStart(textNode, startInNode);
  range.setEnd(textNode, endInNode);
  
  const highlight = document.createElement('mark');
  // ... styling ...
  
  range.surroundContents(highlight);
  found = true;
  break;
} catch (e) {
  console.warn('Could not apply highlight:', e);
  // Continue to next annotation
}
```

If highlighting fails (e.g., range spans multiple elements), it:
1. Logs a warning
2. Continues to the next annotation
3. Doesn't crash the entire system

**Server Error Handling:**
```typescript
if (!user) {
  throw error(401, 'Unauthorized');
}

if (!selectedText || !anchorText) {
  throw error(400, 'Selected text and anchor text are required');
}
```

Proper HTTP status codes for different error types.

### CSS Architecture

**BEM Methodology:**
```scss
.annotation-view-popup {
  // Block styles
  
  &__header {
    // Element styles
  }
  
  &__color {
    // Element styles
  }
  
  &__actions {
    // Element styles
    
    .CrispButton {
      // Nested component styles
    }
  }
}
```

**SCSS Mixins:**
```scss
@include box(28px, 28px);
@include make-flex($dir: row, $just: space-between, $align: center);
```

Uses project-wide mixins for consistent sizing and layout.

**CSS Custom Properties:**
```scss
background: var(--elevation-1);
color: var(--foreground);
border: 1px solid var(--muted-separator);
```

Respects project theme system.

---

## Files Changed

### New Files Created

1. **`src/lib/db/schema/Annotation.schema.ts`**
   - Database schema definition
   - SQLite table structure
   - Field types and constraints

2. **`src/lib/db/Annotation.db.ts`**
   - CRUD operations using Drizzle ORM
   - Type definitions
   - Database query functions

3. **`src/lib/stores/AnnotationStore.ts`**
   - Svelte writable store
   - Store interface and methods
   - State management functions

4. **`src/lib/components/AnnotationPopup.svelte`**
   - Popup UI for creating annotations
   - Color picker
   - Note input
   - Position calculation logic

5. **`src/lib/components/Annotation.svelte`**
   - Component for displaying individual annotations (not actively used in current implementation)
   - Edit/delete functionality
   - Expandable card UI

6. **`docs/ANNOTATIONS.md`**
   - User-facing documentation
   - Feature overview
   - Usage examples

7. **`docs/ANNOTATION_IMPLEMENTATION_DETAILS.md`** (this file)
   - Technical documentation
   - Implementation details
   - Architecture diagrams

### Modified Files

1. **`src/hooks.server.ts`**
   - **Change:** Added "edit" and "delete" icons to Google Fonts icon request
   - **Reason:** Needed for annotation UI buttons
   ```typescript
   const iconsToRequest = [
     'menu',
     'send',
     "edit",     // ← Added
     'close',
     "delete",   // ← Added
     'refresh',
     // ... rest
   ];
   ```

2. **`src/routes/(app)/app/paper/[id]/+page.server.ts`**
   - **Added:** Import statements for annotation database operations
   ```typescript
   import {
     createAnnotation,
     getAnnotationsByPaperId,
     updateAnnotation,
     deleteAnnotation
   } from '$lib/db/Annotation.db';
   import nanoid from '$lib/utils/nanoid';
   ```
   
   - **Added:** Load annotations in page load function
   ```typescript
   const annotations = await getAnnotationsByPaperId(params.id, user.googleId);
   
   return {
     paperId: params.id,
     htmlContent: cleanedHtmlContent,
     abstract,
     toc,
     annotations  // ← Added
   };
   ```
   
   - **Added:** Three new form actions:
     - `createAnnotation`: Creates new annotation
     - `updateAnnotation`: Updates annotation note
     - `deleteAnnotation`: Deletes annotation

3. **`src/routes/(app)/app/paper/[id]/+page@[id].svelte`**
   - **Added:** Import statements
   ```typescript
   import AnnotationPopup from '$lib/components/AnnotationPopup.svelte';
   import { annotationStore } from '$lib/stores/AnnotationStore';
   import { enhance } from '$app/forms';
   import nanoid from '$lib/utils/nanoid';
   ```
   
   - **Added:** State variables for annotation UI
   ```typescript
   let annotations = $state<any[]>([]);
   let showAnnotationPopup = $state(false);
   let annotationPopupComponent = $state<any>(null);
   // ... and many more
   ```
   
   - **Added:** Functions:
     - `getContrastColor()`: Calculates contrasting text color
     - `applyHighlights()`: Renders highlights in document
     - `attachHighlightClickHandlers()`: Adds click listeners
     - `handleHighlightClick()`: Handles highlight clicks
     - `handleHighlightContextMenu()`: Handles right-clicks
     - `handleAnnotationSave()`: Submits new annotation
     - `handleAnnotationUpdate()`: Submits annotation update
     - `handleAnnotationDelete()`: Submits annotation deletion
     - Various helper functions for UI management
   
   - **Added:** Event handlers to paper content
   ```html
   <div
     class="paper-content"
     bind:this={paperContentElement}
     onmouseup={handleSelection}
     onmousedown={handleMouseDown}
     oncontextmenu={handleHighlightContextMenu}
   >
   ```
   
   - **Added:** Hidden forms for progressive enhancement
   ```html
   <form id="annotationForm" method="POST" action="?/createAnnotation" ...>
   <form id="updateAnnotationForm" method="POST" action="?/updateAnnotation" ...>
   <form id="deleteAnnotationForm" method="POST" action="?/deleteAnnotation" ...>
   ```
   
   - **Added:** Conditional UI elements
   ```html
   {#if showAnnotationPopup}
     <AnnotationPopup ... />
   {/if}
   
   {#if showContextMenu && contextMenuAnnotation}
     <div class="highlight-context-menu">...</div>
   {/if}
   
   {#if showAnnotationView && viewAnnotation}
     <div class="annotation-view-popup">...</div>
   {/if}
   ```
   
   - **Added:** SCSS styles for:
     - `.text-highlight`: Highlight styling
     - `.annotation-view-popup`: Annotation view popup
     - `.highlight-context-menu`: Right-click context menu
     - Various modifiers and nested elements

### Database Migration

**Migration File:** `drizzle/0007_mute_wrecking_crew.sql`

Created the `annotations` table in SQLite database.

**Commands Used:**
```bash
npx drizzle-kit generate  # Generated migration SQL
npx drizzle-kit push      # Applied to database
```

---

## Summary

The annotation system is a full-stack feature that:

1. **Captures** user text selections with precise offsets
2. **Stores** annotation data with user/paper relationships
3. **Renders** highlights dynamically using DOM manipulation
4. **Manages** state reactively with Svelte stores
5. **Synchronizes** with server using form actions
6. **Provides** intuitive UI for viewing, editing, and deleting

**Key Technologies:**
- SvelteKit (framework)
- Svelte 5 Runes (reactivity)
- Drizzle ORM (database)
- DOM Range API (text selection)
- TreeWalker API (DOM traversal)
- Form Actions (server communication)

**Architecture Highlights:**
- Progressive enhancement
- Optimistic UI updates
- Error boundaries
- Responsive positioning
- Accessible interactions
- Theme-aware styling

This implementation provides a robust, performant, and user-friendly annotation system for research papers.
