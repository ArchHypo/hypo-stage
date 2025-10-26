# ArchHypo Plugin for Backstage

The ArchHypo Plugin integrates architectural hypothesis management into your Backstage environment, enabling teams to document, track, and validate architectural decisions effectively. This plugin provides a comprehensive framework for managing architectural hypotheses with uncertainty assessment, quality attributes tracking, and technical planning capabilities.

## Features

- **Hypothesis Management**: Create, edit, and track architectural hypotheses with detailed metadata
- **Uncertainty Assessment**: Evaluate hypothesis uncertainty using Likert scale ratings
- **Quality Attributes Tracking**: Associate hypotheses with specific quality attributes (performance, security, maintainability, etc.)
- **Technical Planning**: Create and manage technical planning items linked to hypotheses
- **Visualization**: Track hypothesis evolution and validation status through interactive charts
- **Integration**: Seamlessly integrates with Backstage's catalog and entity system
- **Status Tracking**: Monitor hypothesis lifecycle from creation to validation

## Installation

### Prerequisites

- Backstage application (v1.16.0 or later)
- Node.js (v20 or later)
- Yarn package manager

### Step 0: Clone and Deploy Plugin Directories

Clone this repository:

```bash
git clone git@github.com:cmhpedro/hypo-stage.git
cd hypo-stage
```

After cloning the repository, **each directory must be copied separately** into your Backstage project under the `plugins/` directory:

1. Copy the `hypo-stage` directory to your Backstage project's `plugins/` folder
2. Copy the `hypo-stage-backend` directory to your Backstage project's `plugins/` folder

```bash
# Example command structure
cp -r hypo-stage /path/to/your/backstage/plugins/
cp -r hypo-stage-backend /path/to/your/backstage/plugins/
```

### Step 1: Install the Plugin Packages

Navigate to your Backstage application root directory and install both frontend and backend plugins:

```bash
# Install frontend plugin
yarn --cwd packages/app add @internal/plugin-hypo-stage

# Install backend plugin
yarn --cwd packages/backend add @internal/plugin-hypo-stage-backend
```

### Step 2: Configure the Frontend

#### 2.1 Update App.tsx

Add the ArchHypo plugin routes to your main application:

```tsx
// packages/app/src/App.tsx
import {
  HypoStagePage,
  CreateHypothesisPage,
  HypothesisPage,
  EditHypothesisPage
} from '@internal/plugin-hypo-stage';

const routes = (
  <FlatRoutes>
    {/* ... existing routes ... */}
    <Route path="/hypo-stage" element={<HypoStagePage />} />
    <Route path="/hypo-stage/create-hypothesis" element={<CreateHypothesisPage />} />
    <Route path="/hypo-stage/hypothesis/:hypothesisId" element={<HypothesisPage />} />
    <Route path="/hypo-stage/hypothesis/:hypothesisId/edit" element={<EditHypothesisPage />} />
  </FlatRoutes>
);
```

#### 2.2 Update Root Component

Add the ArchHypo navigation item to your sidebar:

```tsx
// packages/app/src/components/Root/Root.tsx
import LaptopMacIcon from '@material-ui/icons/LaptopMac';

// In your SidebarGroup component
<SidebarItem icon={LaptopMacIcon} to="hypo-stage" text="Hypo Stage" />
```

### Step 3: Configure the Backend

#### 3.1 Add Backend Plugin

Add the ArchHypo backend plugin to your backend:

```ts
// packages/backend/src/index.ts
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ... existing backend plugins ...

// Add ArchHypo backend plugin
backend.add(import('@internal/plugin-hypo-stage-backend'));

backend.start();
```

#### 3.2 Configure APIs in Backstage

**Important**: In order for `hypo-stage-backend` to work properly, you must add the following API definition to your Backstage application
in the respective files:

```ts
// packages/app/src/apis.ts

// Make sure to also import these references
import {
   // Other imports already exists
+  discoveryApiRef,
+  fetchApiRef,
 } from '@backstage/core-plugin-api';

import { 
  HypoStageApiClient, 
  HypoStageApiRef 
} from '@internal/plugin-hypo-stage';

// Add to the API factory array right after 
createApiFactory({
  api: HypoStageApiRef,
  deps: {
    discoveryApi: discoveryApiRef,
    fetchApi: fetchApiRef,
  },
  factory: ({ discoveryApi, fetchApi }) =>
    new HypoStageApiClient({ discoveryApi, fetchApi }),
}),

## Usage

### Accessing the Plugin

1. Start your Backstage application:
2. Navigate to the "Hypo Stage" section in the sidebar or visit `/hypo-stage` directly.

### Creating a Hypothesis

1. Click "Create New Hypothesis" on the main page
2. Fill in the required fields:
   - **Statement**: Clear, testable hypothesis statement
   - **Context**: Background and reasoning
   - **Uncertainty Rating**: Assess how uncertain you are (1-5 scale)
   - **Impact Rating**: Assess potential impact (1-5 scale)
   - **Quality Attributes**: Select relevant quality attributes
   - **Evidence URLs**: Add supporting documentation links

3. Click "Create Hypothesis" to save

### Managing Hypotheses

- **View All**: Browse all hypotheses on the main page
- **View Details**: Click on any hypothesis to see detailed information
- **Edit**: Use the edit button to modify hypothesis details
- **Track Evolution**: Monitor hypothesis status changes over time

### Technical Planning

1. Navigate to a hypothesis detail page
2. Use the "Technical Planning" section to add planning items
3. Track implementation progress and link to specific tasks

## API Reference

### Frontend Components

- `HypoStagePage`: Main dashboard component
- `CreateHypothesisPage`: Form for creating new hypotheses
- `HypothesisPage`: Detailed view of a specific hypothesis
- `EditHypothesisPage`: Form for editing existing hypotheses
- `HypothesisForm`: Reusable form component for hypothesis data
- `HypothesisList`: List view of all hypotheses

### Backend Services

- `HypothesisService`: Core service for hypothesis management
- Database migrations for schema setup
- RESTful API endpoints for CRUD operations
