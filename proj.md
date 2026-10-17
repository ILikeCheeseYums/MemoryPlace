# 1. Data Ingestion(App.jsx)
- a. The application uses react-dropzone to capture image files dragged into the browser.  
- b.It generates temporary local URLs (URL.createObjectURL) for these images so they load instantly without needing a backend upload.

# 2. The Nomenclature Engine(graph.js)
a. Parsing: The parseItem function uses a regular expression (/(?:^|[^0-9A-Za-z])(\d+)([A-Za-z]+)(?:[-_]([A-Za-z0-9_]+))?(?:$|[^0-9A-Za-z])/) to strip out the Step (e.g., 1), Branch (e.g., A), and Turn (e.g., F). It also detects if the file is a panorama by looking for the word "pano".  
 b.Graph Linking: buildGraphFromNomenclature groups all images by branch, sorts them by step number, and pushes bidirectional edges (forward and backward) to a graph object so the UI knows exactly which images connect to each other.

# 3. The Interactive Viewer(StreetViewer.jsx & index.css)
- a. Dual-Layer Crossfade: Instead of loading new images aggressively, the viewer utilizes two div layers (layerARef and layerBRef). When a user steps forward, the new image loads on the hidden layer, and a 200ms CSS transition crossfades the opacity for a seamless visual step. 

-  b.Perspective Rendering: Standard 3D engines like Three.js are heavy. Immersia uses native CSS variables (--pan-x, --tilt-y, --zoom) mapped to React mouse/touch drag events, applying a CSS transform: translate3d(...) rotateY(...) to simulate a 3D camera.   

# 4. A Vite environment 
- generally refers to one of two things depending on context: Environment Variables and modes(configuration settings that change how your app behaves across dev, staging, or production) or the Vite Environment API (a system for managing multiple custom runtimes and build targets like client apps, SSR, or edge workers)