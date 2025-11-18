# Annotation and Notes Feature

## Overview
The annotation feature allows users to select text in research papers, add highlights with customizable colors, and attach notes to their selections. All annotations are anchored to the selected text and persist across sessions.

## Features

### 1. **Text Selection and Highlighting**
- Select any text in the paper to trigger the annotation popup
- Choose from 5 highlight colors (Yellow, Green, Blue, Pink, Purple)
- Create highlight-only annotations without notes
- Visual feedback with customizable highlight colors

### 2. **Note-Taking**
- Add detailed notes to any highlighted text
- Edit notes after creation
- View notes by clicking on annotation markers
- Delete annotations when no longer needed

### 3. **Data Persistence**
- All annotations are stored in the database
- Associated with specific papers and users
- Automatically loaded when viewing a paper
- Synchronized across sessions

## Architecture

### Database Schema
```typescript
// src/lib/db/schema/Annotation.schema.ts
{
  id: string (primary key)
  paperId: string (references paper)
  userId: string (references user)
  selectedText: string (the highlighted text)
  anchorText: string (surrounding context for anchoring)
  note: string (optional user note)
  highlightColor: string (hex color code)
  startOffset: number (character position start)
  endOffset: number (character position end)
  createdAt: string (ISO timestamp)
  updatedAt: string (ISO timestamp)
}
```

### Components

#### **AnnotationPopup.svelte**
- Appears when text is selected
- Provides color picker for highlights
- Text area for adding notes
- "Highlight Only" and "Save Note" actions
- Auto-positions near selection with viewport boundary detection

#### **Annotation.svelte**
- Displays annotation markers in the document
- Expandable card showing note details
- Edit and delete functionality
- Shows creation date and selected text

#### **AnnotationStore.ts**
- Svelte store for managing annotation state
- CRUD operations on local state
- Syncs with server through form actions

### Server Actions

Located in `src/routes/(app)/app/paper/[id]/+page.server.ts`:

1. **createAnnotation** - Creates new annotation with text, note, and highlight color
2. **updateAnnotation** - Updates note content of existing annotation
3. **deleteAnnotation** - Removes annotation from database
4. **load function** - Loads all annotations for a paper on page load

### Database Operations

Located in `src/lib/db/Annotation.db.ts`:

- `createAnnotation(data)` - Insert new annotation
- `getAnnotationsByPaperId(paperId, userId)` - Fetch user's annotations for a paper
- `getAnnotationById(id)` - Get single annotation
- `updateAnnotation(id, updates)` - Update annotation fields
- `deleteAnnotation(id)` - Delete annotation
- `deleteAnnotationsByPaperId(paperId, userId)` - Bulk delete

## User Flow

### Creating an Annotation

1. User selects text in the paper
2. `handleSelection()` detects the selection
3. AnnotationPopup component appears near selection
4. User chooses highlight color and optionally adds a note
5. Click "Highlight Only" or "Save Note"
6. Form submission via `createAnnotation` action
7. Annotation stored in database
8. Store updated with new annotation
9. Highlight rendered in document

### Viewing Annotations

1. Annotations loaded on page mount
2. Highlighted text shown with colored background
3. Annotation markers indicate note presence
4. Click marker to expand note card
5. View selected text and note content

### Editing/Deleting Annotations

1. Click annotation marker to expand card
2. Click edit button to enter edit mode
3. Modify note text and save
4. Or click delete to remove annotation
5. Changes sync to database via form actions
6. Store updates reflect in UI

## Technical Details

### Text Anchoring
- Uses `startOffset` and `endOffset` for precise positioning
- `anchorText` provides 50 characters of context before and after selection
- Helps re-locate text even if document structure changes slightly

### Styling
- Highlights use semi-transparent colors for readability
- Hover effect on highlights (opacity change)
- Popup positioned with viewport boundary detection
- Responsive design for mobile and desktop

### State Management
- Svelte 5 runes (`$state`, `$props`, `$effect`)
- Form actions with `use:enhance` for progressive enhancement
- Store for reactive annotation list
- Server-side rendering of initial data

## Integration Points

### With AI Chat
- Selected text can be used for both annotations and AI queries
- Separate flows but shared selection detection
- AI chat can reference annotated sections

### With Paper Reader
- Annotations rendered inline with paper content
- No disruption to paper layout
- Integrates with existing scroll and navigation

## Future Enhancements

Possible improvements:
- [ ] Export annotations to markdown/PDF
- [ ] Share annotations with other users
- [ ] Annotation search and filter
- [ ] Keyboard shortcuts for quick annotation
- [ ] Rich text formatting in notes
- [ ] Tag system for categorizing annotations
- [ ] Annotation analytics (most highlighted sections)
- [ ] Collaborative annotations
- [ ] Annotation templates for common note types

## Database Migration

The annotations table was created with migration:
```bash
npx drizzle-kit generate  # Generate migration SQL
npx drizzle-kit push      # Apply to database
```

Migration file: `drizzle/0007_mute_wrecking_crew.sql`

## Files Created/Modified

### New Files
- `src/lib/db/schema/Annotation.schema.ts` - Database schema
- `src/lib/db/Annotation.db.ts` - CRUD operations
- `src/lib/stores/AnnotationStore.ts` - State management
- `src/lib/components/AnnotationPopup.svelte` - Selection popup UI
- `src/lib/components/Annotation.svelte` - Annotation display
- `docs/ANNOTATIONS.md` - This documentation

### Modified Files
- `src/routes/(app)/app/paper/[id]/+page.server.ts` - Added actions and load function
- `src/routes/(app)/app/paper/[id]/+page@[id].svelte` - Integrated annotation UI

## Usage Example

```typescript
// In paper page component
import { annotationStore } from '$lib/stores/AnnotationStore';
import AnnotationPopup from '$lib/components/AnnotationPopup.svelte';

// Load annotations
onMount(() => {
  if (data.annotations) {
    annotationStore.setAnnotations(data.annotations);
  }
});

// Handle text selection
function handleSelection() {
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    showAnnotationPopup = true;
    // Show popup and capture selection data
  }
}

// Save annotation
function handleAnnotationSave(annotationData) {
  // Submit form to server action
  // Update store on success
}
```

## Testing

To test the annotation feature:

1. Navigate to a paper page
2. Select any text in the paper
3. Annotation popup should appear
4. Choose a color and add a note
5. Click "Save Note"
6. Verify highlight appears in document
7. Click annotation marker to view note
8. Edit or delete the annotation
9. Refresh page to verify persistence
