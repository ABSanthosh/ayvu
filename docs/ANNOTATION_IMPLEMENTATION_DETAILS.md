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
│                      User Interface Layer                   │
├─────────────────────────────────────────────────────────────┤
│  AnnotationPopup.svelte  │  Paper Page (+page@[id].svelte)  │
│  - Color picker           │  - Text selection handlers      │
│  - Note input             │  - Highlight rendering          │
│  - Position calculation   │  - Context menus                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    State Management Layer                   │
├─────────────────────────────────────────────────────────────┤
│              AnnotationStore.ts (Svelte Store)              │
│  - annotations: AnnotationData[]                            │
│  - activeAnnotationId: string | null                        │
│  - isCreating: boolean                                      │
│  + setAnnotations, addAnnotation, updateAnnotation, etc.    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Server Action Layer                      │
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
│                     Database Layer                          │
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
│                    Database Schema                          │
├─────────────────────────────────────────────────────────────┤
│               Annotation.schema.ts (SQLite)                 │
│  Table: annotations                                         │
│  - id (TEXT, PRIMARY KEY)                                   │
│  - paperId (TEXT)                                           │
│  - userId (TEXT)                                            │
│  - selectedText (TEXT)                                      │
│  - anchorText (TEXT)                                        │
│  - note (TEXT, nullable)                                    │
│  - highlightColor (TEXT, default: '#ffeb3b')              │
│  - startOffset (INTEGER)                                    │
│  - endOffset (INTEGER)                                      │
│  - createdAt (TEXT, ISO timestamp)                          │
│  - updatedAt (TEXT, ISO timestamp)                          │
└─────────────────────────────────────────────────────────────┘
```

The annotation system consists of five main layers:

**User Interface Layer:**

- AnnotationPopup.svelte handles the color picker, note input, and position calculation
- Paper Page component manages text selection handlers, highlight rendering, and context menus

**State Management Layer:**

- AnnotationStore (Svelte Store) maintains the annotations array, active annotation ID, and creation state
- Provides methods like setAnnotations, addAnnotation, updateAnnotation, and removeAnnotation

**Server Action Layer:**

- SvelteKit page server implements form actions for create, update, and delete operations
- The load function retrieves all annotations for a specific paper

**Database Layer:**

- Annotation.db.ts uses Drizzle ORM for database operations
- Provides functions for creating, retrieving, updating, and deleting annotations

**Database Schema:**

- SQLite table named "annotations" stores all annotation data
- Contains fields for id, paperId, userId, selectedText, anchorText, note, highlightColor, startOffset, endOffset, createdAt, and updatedAt

---

## Database Layer

### Schema Definition (`src/lib/db/schema/Annotation.schema.ts`)

The schema defines a SQLite table called "annotations" using Drizzle ORM. It imports necessary types from drizzle-orm/sqlite-core and creates a table with text and integer fields. The id field is marked as the primary key and all required fields are marked as not null. The highlightColor field has a default value of yellow (#ffeb3b).

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

The file exports an AnnotationData interface that defines the structure of annotation objects. This interface includes all the necessary fields for an annotation including string fields for IDs and text content, nullable strings for optional note and color, numeric fields for offsets, and ISO timestamp strings for creation and update times.

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

The store manages the client-side state of annotations using Svelte's writable store. It exports an interface that defines three properties: an array of annotations, an optional activeAnnotationId to track the currently selected annotation, and a boolean isCreating flag to prevent multiple simultaneous creation operations.

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
Components import the annotationStore and subscribe to it to receive updates when the state changes. They can call methods on the store to add, update, or remove annotations. The subscription pattern follows standard Svelte store conventions where the subscribe method returns an unsubscribe function for cleanup.

---

## Frontend Components

### 1. AnnotationPopup Component (`src/lib/components/AnnotationPopup.svelte`)

**Purpose:** Shows a popup when user selects text, allowing them to choose a highlight color and add a note.

**Props:**
The component accepts three props: paperId (string) for identifying the paper, onSave (callback function) that gets called when the user saves an annotation, and onCancel (callback function) for cancellation handling.

**Internal State:**
The component maintains several reactive state variables using Svelte 5's $state rune including position coordinates for popup placement, the note text entered by the user, the selected highlight color (defaulting to yellow), the selected text content, anchor text for context, start and end offsets for text position, and a reference to the popup DOM element.

**Key Features:**

1. **Text Anchoring:**
   The show function extracts the selected text and captures surrounding context. It retrieves the selection range and gets 50 characters before and after the selection to create an anchor text. This helps relocate the text even if the document structure changes slightly. The function also stores the start and end offsets of the selection within the text node.

2. **Smart Positioning:**
   A reactive effect checks the popup element's position and adjusts it to stay within viewport boundaries. It calculates the popup's bounding rectangle and compares it against the viewport dimensions. If the popup would extend beyond the horizontal edges, it shifts the position inward with a small margin. If there's insufficient vertical space above the selection, it repositions the popup below the selection instead.

3. **Color Palette:**
   The component provides five preset highlight colors: yellow, green, blue, pink, and purple. Each color has a name and hex value. Users can select any of these colors for their highlights, and the UI provides visual feedback to indicate which color is currently selected.

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
The page maintains multiple reactive state variables including the annotations array, popup visibility flags for creation and viewing, references to the popup component and paper content element, context menu visibility and position, the currently selected annotation for context menu operations, and position coordinates for the annotation view popup.

**Initialization:**
On component mount, the page loads annotations from server data into the annotation store and subscribes to store updates. Any changes to the store automatically update the local annotations array. The subscription is properly cleaned up when the component unmounts by returning the unsubscribe function.

---

## Text Selection & Highlighting

### Selection Detection

**Mouse Event Handlers:**
The handleSelection function detects when users complete a text selection. It retrieves the window selection object, checks if it's not collapsed (meaning text is selected), and extracts the selected text. If valid text is found, it gets the selection range and its bounding rectangle, then shows the annotation popup at that location by calling the popup component's show method.

The handleMouseDown function clears any existing selection state when the user starts a new selection by clicking down with an empty selection.

These handlers are attached to the paper content element using the onmouseup, onmousedown, and oncontextmenu event attributes. The paper content div is also bound to the paperContentElement variable using Svelte's bind:this directive.

### Highlight Rendering

**The `applyHighlights()` Function:**

This is the core function that renders highlights in the document. It first checks if the paper content element exists and if there are any annotations to apply.

The function follows these steps:

1. **Clean Up:** Removes all existing mark elements with the text-highlight class by replacing them with plain text nodes, then normalizes the parent to merge adjacent text nodes
2. **Find Paragraphs:** Queries for all elements that might contain text including paragraphs, divs, spans, and headings
3. **Locate Text:** For each annotation, searches through paragraphs to find one containing the selected text using indexOf
4. **Tree Walker:** Uses the TreeWalker API to iterate precisely through text nodes within the matched paragraph
5. **Calculate Offsets:** Tracks cumulative character positions as it walks through text nodes to find the exact node and offset where the annotation starts
6. **Create Highlight:** Creates a Range object at the exact position and uses surroundContents to wrap the text in a mark element
7. **Style Highlight:** Applies the annotation's background color and a contrasting text color calculated by getContrastColor
8. **Add Metadata:** Stores the annotation ID as a data attribute and sets a title attribute showing the note

**Reactive Re-application:**
A reactive effect monitors the paperContentElement and annotations array. When either changes and annotations exist, it uses a small timeout to ensure the DOM is ready, then calls applyHighlights and attachHighlightClickHandlers to re-render all highlights.

### Contrast Color Calculation

This function ensures text is readable on any highlight color by calculating an appropriate contrasting text color. It converts the hex color to RGB values by parsing pairs of hexadecimal digits. Then it calculates the relative luminance using the standard formula (0.299 _ red + 0.587 _ green + 0.114 \* blue) divided by 255. If the luminance is greater than 0.5 (indicating a light background), it returns dark text color. Otherwise, it returns light text for dark backgrounds.

### Highlight Click Handling

**Attaching Click Listeners:**
The attachHighlightClickHandlers function queries for all mark elements with the text-highlight class and attaches click event listeners to each one.

When a highlight is clicked, the handleHighlightClick function stops event propagation to prevent triggering other click handlers. It extracts the annotation ID from the data-annotation-id attribute and finds the corresponding annotation in the annotations array. If found, it gets the highlight's bounding rectangle, sets the viewAnnotation state, calculates a position below the highlight (centered horizontally, with a 10px margin vertically), and shows the annotation view popup.

### Context Menu (Right-Click)

**Right-Click Handler:**
The handleHighlightContextMenu function checks if the right-click target has the text-highlight class. If so, it prevents the default browser context menu from appearing. It extracts the annotation ID and finds the corresponding annotation object.

To ensure the context menu stays visible on screen, it calculates the menu position with constraints. It uses the mouse click coordinates but adjusts them if the menu would extend beyond the window boundaries (using estimated dimensions of 350x200 pixels). The adjusted position is stored and the context menu is shown, providing options to edit or delete the annotation.

---

## Server Actions

### Server-Side Operations (`src/routes/(app)/app/paper/[id]/+page.server.ts`)

**Loading Annotations:**
The page's load function is an async server-side function that retrieves the current user from the parent layout. If no user is authenticated, it throws a 401 Unauthorized error.

The function calls getAnnotationsByPaperId with the paper ID from route params and the user's Google ID to fetch all annotations belonging to that user for the specific paper. The annotations are included in the returned data object along with other paper data like paperId, htmlContent, abstract, and table of contents. This server-side rendering approach sends the annotations to the client with the initial page load.

**Form Actions:**

1. **Create Annotation:**
   This form action receives the annotation data from the client form submission. It first checks if a user is authenticated, throwing a 401 error if not. The function extracts all annotation data from the form including selectedText, anchorText, note, highlightColor, and numeric offsets. It validates that required fields (selectedText and anchorText) are present, throwing a 400 error if they're missing.

A new annotation object is constructed with a unique ID generated by nanoid, the paper ID from route params, the user's Google ID, all the form data, default values where applicable (empty string for note, yellow color if not specified), and ISO timestamp strings for creation and update times. The annotation is saved to the database and returned to the client with a success flag.

2. **Update Annotation:**
   This form action handles annotation updates. After verifying user authentication, it extracts the annotation ID and new note text from the form data. It validates that an ID was provided (throwing a 400 error if missing), then calls the database updateAnnotation function with the ID and an object containing the updated note field. The updatedAt timestamp is automatically handled by the database layer. The action returns a success flag to the client.

3. **Delete Annotation:**
   This form action handles annotation deletion. After authentication verification, it extracts the annotation ID from the form data and validates its presence. It then calls the database deleteAnnotation function with the ID to remove the annotation record. A success flag is returned to indicate the deletion completed successfully.

---

## User Interaction Flow

### Creating an Annotation

**Step-by-Step Process:**

1. **User selects text** in the paper - The onmouseup event fires on the paper-content element, triggering the handleSelection function

2. **Selection is validated** - The function gets the window selection object and checks if it's not collapsed (meaning text is actually selected). It extracts and trims the text, continuing only if valid text exists

3. **AnnotationPopup appears** - The selection's range and bounding rectangle are retrieved. The showAnnotationPopup flag is set to true and the popup component's show method is called with the selection and rectangle data

4. **Popup extracts context** - The popup gets 50 characters before and after the selection for anchoring, stores the start and end offsets, and positions itself near the selection

5. **User chooses color and adds note** - The user clicks on color buttons to select a highlight color and optionally types a note in the textarea

6. **User clicks save button** - Either handleSave or handleHighlightOnly is called depending on which button was clicked, and the onSave callback is invoked with the annotation data

7. **Parent component receives data** - The handleAnnotationSave function finds the hidden annotation form, populates all its input fields with the annotation data, and calls requestSubmit to trigger form submission

8. **Hidden form submits to server** - A hidden form with POST method and createAnnotation action submits. The enhance directive intercepts the submission and handles the response, adding the annotation to the store on success

9. **Server creates annotation** - The server validates user authentication, generates a unique ID using nanoid, constructs the annotation object, inserts it into the database using Drizzle ORM, and returns the created annotation

10. **Client updates store** - The annotation store's addAnnotation method is called with the newly created annotation data

11. **Reactive effect triggers** - A Svelte effect monitors the paperContentElement and annotations array. When changes are detected, it schedules a call to applyHighlights and attachHighlightClickHandlers after a brief delay

12. **Highlight appears in document** - The applyHighlights function locates the text in the DOM, wraps it in a mark element, applies the chosen color with contrasting text, and attachHighlightClickHandlers adds click event listeners

### Viewing an Annotation

1. **User clicks on a highlight** - The handleHighlightClick function is triggered and extracts the annotation ID from the clicked element's data-annotation-id attribute

2. **Annotation data is retrieved** - The annotations array is searched using find to locate the annotation object with the matching ID

3. **View popup appears** - The viewAnnotation state is set to the found annotation object. The viewAnnotationPosition is calculated to be centered horizontally below the highlight with a 10px vertical margin. The showAnnotationView flag is set to true

4. **Popup displays** - The popup shows a color indicator matching the highlight color, the creation date formatted nicely, the note text if present, and Edit and Delete action buttons

### Editing an Annotation

1. **User clicks "Edit Note" in view popup** - The handleEditAnnotation function shows a browser prompt dialog pre-filled with the current note text. If the user provides new text (not null), it calls handleAnnotationUpdate with the annotation ID and new note, then closes the view popup

2. **Update form submits** - The handleAnnotationUpdate function finds the hidden update form, sets its ID and note input fields to the provided values, and calls requestSubmit to trigger the form submission

3. **Server updates annotation** - The server action updates the note field in the database, automatically updates the updatedAt timestamp, and returns a success response

4. **Client updates store** - The form's enhance handler receives the success response and calls annotationStore.updateAnnotation with the ID and updated note

5. **Highlights are refreshed** - The reactive effect detects the store change and triggers re-rendering of highlights with the updated annotation data

### Deleting an Annotation

1. **User clicks "Delete" button** - Available in both the view popup and context menu

2. **Confirmation dialog** - A browser confirm dialog asks the user to confirm deletion. If confirmed, handleAnnotationDelete is called with the annotation ID and the view popup is closed

3. **Delete form submits** - The handleAnnotationDelete function finds the hidden delete form, sets its ID input field, and calls requestSubmit

4. **Server deletes annotation** - The server action removes the annotation record from the database and returns a success response

5. **Client updates store** - The form's enhance handler calls annotationStore.removeAnnotation with the deleted annotation's ID to remove it from the local state

6. **Highlight is removed** - The reactive effect detects the store change and calls applyHighlights, which clears all existing highlights and re-renders only the remaining annotations, effectively removing the deleted highlight from the document

---

## Technical Deep Dive

### Progressive Enhancement Pattern

The annotation system uses SvelteKit's form actions with the enhance directive for progressive enhancement. Hidden forms are styled with display:none and use POST method with named actions like ?/createAnnotation. The enhance directive intercepts form submissions and provides a callback that receives the update function and result object. When the result indicates success, the callback extracts the annotation data and adds it to the store before calling the update function to complete the standard form handling.

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
For each annotation, the system finds paragraphs containing the selected text, then creates a TreeWalker to traverse text nodes. As it walks through nodes, it maintains a running character offset counter. When it finds the correct offset position, it creates a Range object at that exact location, wraps the range in a mark element, applies styling and metadata attributes, then continues to the next annotation.

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
A Svelte 5 effect runs when showAnnotationView is true. It defines a handleClickOutside function that checks if the click target is outside both the annotation-view-popup and text-highlight elements using the closest method. If the click is outside, it closes the view. The effect adds this listener to the document and returns a cleanup function that removes the listener when the popup closes or the effect re-runs.

**Why stopPropagation in Highlight Click:**
The handleHighlightClick function calls event.stopPropagation() at the beginning to prevent the click event from bubbling up to the document level, which would immediately trigger the click-outside handler and close the popup that was just opened.

### Performance Considerations

**Debouncing Highlight Application:**
A setTimeout with 100ms delay wraps the calls to applyHighlights and attachHighlightClickHandlers. This small delay ensures the DOM is fully rendered before attempting to apply highlights.

**Single DOM Query:**
The system queries for all potential text containers (paragraphs, divs, spans, headings) in a single querySelectorAll call with a multi-selector string, then iterates through the results. This is more efficient than multiple separate queries.

**Early Exit:**
When searching through paragraphs for annotation text, the loop uses a found flag. As soon as the text is located and highlighted, it breaks out of the loop to avoid unnecessary iteration through remaining paragraphs.

### Error Handling

**Graceful Degradation:**
The highlight application logic is wrapped in a try-catch block. If highlighting fails for any reason (such as a range spanning multiple elements which causes surroundContents to throw), the catch block logs a warning to the console and continues processing the next annotation. This prevents one problematic annotation from crashing the entire highlighting system.

**Server Error Handling:**
Server actions validate inputs and throw appropriate HTTP error responses. Authentication failures throw 401 Unauthorized errors. Missing required fields throw 400 Bad Request errors with descriptive messages. This provides proper status codes and error information to the client.

### CSS Architecture

**BEM Methodology:**
The CSS follows Block Element Modifier naming conventions. Block classes like annotation-view-popup contain element classes using the double underscore notation (popup**header, popup**color, popup\_\_actions). This provides clear hierarchical structure and avoids naming conflicts.

**SCSS Mixins:**
The styles use project-wide SCSS mixins for consistency. For example, the box mixin sets dimensions, and make-flex mixin creates flexbox layouts with specified direction, justification, and alignment parameters.

**CSS Custom Properties:**
All colors and theme-specific values reference CSS custom properties (variables) like --elevation-1 for backgrounds, --foreground for text colors, and --muted-separator for borders. This ensures the annotation UI respects the project's theme system and adapts to light/dark modes.

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
   	'edit', // ← Added
   	'close',
   	'delete', // ← Added
   	'refresh'
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
   	annotations // ← Added
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
   	bind:this="{paperContentElement}"
   	onmouseup="{handleSelection}"
   	onmousedown="{handleMouseDown}"
   	oncontextmenu="{handleHighlightContextMenu}"
   ></div>
   ```

   - **Added:** Hidden forms for progressive enhancement

   ```html
   <form id="annotationForm" method="POST" action="?/createAnnotation" ...>
   	<form id="updateAnnotationForm" method="POST" action="?/updateAnnotation" ...>
   		<form id="deleteAnnotationForm" method="POST" action="?/deleteAnnotation" ...></form>
   	</form>
   </form>
   ```

   - **Added:** Conditional UI elements

   ```html
   {#if showAnnotationPopup}
   <AnnotationPopup ... />
   {/if} {#if showContextMenu && contextMenuAnnotation}
   <div class="highlight-context-menu">...</div>
   {/if} {#if showAnnotationView && viewAnnotation}
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
