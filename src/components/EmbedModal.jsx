import React, { useState, useEffect, useMemo } from "react";
import {
  Code,
  Copy,
  Check,
  Download,
  FileCode,
  Archive,
  X,
  Eye,
  Monitor,
  Smartphone,
  Tablet,
  ExternalLink,
} from "lucide-react";
import {
  prepareStandaloneGraph,
  generateMiniViewerHtml,
  generateSeparateFilesZip,
  downloadFile,
} from "../utils/exporter.js";

export default function EmbedModal({ isOpen, onClose, graph, images = [] }) {
  const [activeTab, setActiveTab] = useState("export"); // "export" | "preview"
  const [copied, setCopied] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparedGraph, setPreparedGraph] = useState(null);
  const [previewDevice, setPreviewDevice] = useState("desktop"); // "desktop" | "tablet" | "mobile"

  // Iframe Configuration options
  const [iframeSrc, setIframeSrc] = useState("street-viewer.html");
  const [iframeWidth, setIframeWidth] = useState("100%");
  const [iframeHeight, setIframeHeight] = useState("600px");
  const [borderRadius, setBorderRadius] = useState("12px");
  const [allowFullscreen, setAllowFullscreen] = useState(true);

  // Prepare base64 standalone graph when modal opens
  useEffect(() => {
    if (!isOpen || !graph || !graph.nodes) return;

    let isMounted = true;
    setIsPreparing(true);

    prepareStandaloneGraph(graph, images)
      .then((standaloneGraph) => {
        if (isMounted) {
          setPreparedGraph(standaloneGraph);
          setIsPreparing(false);
        }
      })
      .catch((err) => {
        console.error("Failed to prepare standalone graph:", err);
        if (isMounted) setIsPreparing(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, graph, images]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Generated mini HTML string
  const standaloneHtml = useMemo(() => {
    if (!preparedGraph) return "";
    return generateMiniViewerHtml({
      graph: preparedGraph,
      title: "Interactive 3D Street Viewer",
    });
  }, [preparedGraph]);

  // Generated iframe snippet
  const iframeSnippet = useMemo(() => {
    const borderStyle = borderRadius
      ? `border: 0; border-radius: ${borderRadius}; overflow: hidden;`
      : `border: 0;`;

    return `<iframe
  src="${iframeSrc}"
  width="${iframeWidth}"
  height="${iframeHeight}"
  style="${borderStyle}"
  loading="lazy"
  allow="accelerometer; gyroscope; fullscreen"
  ${allowFullscreen ? "allowfullscreen" : ""}
></iframe>`;
  }, [iframeSrc, iframeWidth, iframeHeight, borderRadius, allowFullscreen]);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(iframeSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (err) {
      console.warn("Clipboard copy failed, fallback:", err);
    }
  };

  const handleDownloadHtml = () => {
    if (!standaloneHtml) return;
    downloadFile(standaloneHtml, iframeSrc.endsWith(".html") ? iframeSrc : `${iframeSrc}.html`, "text/html");
  };

  const handleDownloadZip = () => {
    if (!preparedGraph) return;
    const zipBlob = generateSeparateFilesZip({
      graph: preparedGraph,
      title: "Interactive 3D Street Viewer",
    });
    downloadFile(zipBlob, "street-viewer-embed.zip", "application/zip");
  };

  const previewWidthStyle =
    previewDevice === "mobile"
      ? "max-w-[390px] h-[580px]"
      : previewDevice === "tablet"
      ? "max-w-[768px] h-[540px]"
      : "w-full h-[520px]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#14161c] border border-white/10 rounded-2xl shadow-2xl text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1a1d24]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1a73e8]/20 border border-[#1a73e8]/40 flex items-center justify-center text-[#8ab4f8]">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Embed Street Viewer as iframe
              </h2>
              <p className="text-xs text-gray-400">
                Download a self-contained mini HTML page & embed it on any website
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Nav Tabs */}
            <div className="flex bg-[#0b0c0e] p-1 rounded-lg border border-white/10 text-xs">
              <button
                onClick={() => setActiveTab("export")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === "export"
                    ? "bg-[#1a73e8] text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export & Embed</span>
              </button>
              <button
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  activeTab === "preview"
                    ? "bg-[#1a73e8] text-white shadow-sm"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Iframe Preview</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isPreparing ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-10 h-10 border-3 border-[#1a73e8] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-300 font-medium">
                Bundling images and compiling mini HTML page...
              </p>
            </div>
          ) : activeTab === "export" ? (
            <>
              {/* Step 1: Download Mini HTML / CSS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold tracking-wider text-[#8ab4f8] uppercase flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1a73e8]/30 text-[#8ab4f8] text-xs flex items-center justify-center font-bold">
                      1
                    </span>
                    Download the Mini HTML Page
                  </h3>
                  <span className="text-xs text-gray-400">
                    {graph?.nodes?.length || 0} viewpoints packaged
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Standalone HTML Option */}
                  <div className="p-4 rounded-xl bg-[#1e222b] border border-white/10 hover:border-[#1a73e8]/50 transition-all flex flex-col justify-between group">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-white font-semibold">
                          <FileCode className="w-5 h-5 text-[#8ab4f8]" />
                          <span>Standalone Mini HTML</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#1a73e8]/20 text-[#8ab4f8] font-bold uppercase tracking-wider">
                          Recommended
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Single self-contained <code className="text-gray-300">.html</code> file with embedded CSS, vanilla JS, and base64 images. Zero external dependencies.
                      </p>
                    </div>

                    <button
                      onClick={handleDownloadHtml}
                      className="mt-4 w-full py-2.5 px-4 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] active:scale-[0.98] text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download {iframeSrc}</span>
                    </button>
                  </div>

                  {/* ZIP Package Option */}
                  <div className="p-4 rounded-xl bg-[#1e222b] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between group">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-white font-semibold">
                          <Archive className="w-5 h-5 text-emerald-400" />
                          <span>HTML & CSS Package (.zip)</span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-gray-300 font-medium">
                          Separate Files
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        Zip bundle containing separate <code className="text-gray-300">index.html</code>, <code className="text-gray-300">style.css</code>, and <code className="text-gray-300">viewer.js</code>.
                      </p>
                    </div>

                    <button
                      onClick={handleDownloadZip}
                      className="mt-4 w-full py-2.5 px-4 rounded-lg bg-[#282c37] hover:bg-[#343a48] active:scale-[0.98] text-white font-medium text-xs flex items-center justify-center gap-2 transition-all border border-white/10"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download ZIP (.zip)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2: Configure & Copy Iframe Snippet */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold tracking-wider text-[#8ab4f8] uppercase flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#1a73e8]/30 text-[#8ab4f8] text-xs flex items-center justify-center font-bold">
                      2
                    </span>
                    Paste the &lt;iframe&gt; into Your Website
                  </h3>

                  <button
                    onClick={handleCopyCode}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      copied
                        ? "bg-emerald-600 text-white"
                        : "bg-[#1a73e8] hover:bg-[#1557b0] text-white"
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Iframe Code</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Configuration Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 rounded-xl bg-[#0e1015] border border-white/10 text-xs">
                  <div>
                    <label className="text-gray-400 block mb-1">File Name / Path</label>
                    <input
                      type="text"
                      value={iframeSrc}
                      onChange={(e) => setIframeSrc(e.target.value)}
                      className="w-full bg-[#1e222b] border border-white/15 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#1a73e8]"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Width</label>
                    <input
                      type="text"
                      value={iframeWidth}
                      onChange={(e) => setIframeWidth(e.target.value)}
                      className="w-full bg-[#1e222b] border border-white/15 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#1a73e8]"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Height</label>
                    <input
                      type="text"
                      value={iframeHeight}
                      onChange={(e) => setIframeHeight(e.target.value)}
                      className="w-full bg-[#1e222b] border border-white/15 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#1a73e8]"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Rounded Corners</label>
                    <select
                      value={borderRadius}
                      onChange={(e) => setBorderRadius(e.target.value)}
                      className="w-full bg-[#1e222b] border border-white/15 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-[#1a73e8]"
                    >
                      <option value="12px">12px Rounded</option>
                      <option value="16px">16px Large</option>
                      <option value="8px">8px Subtle</option>
                      <option value="0px">None (Square)</option>
                    </select>
                  </div>
                </div>

                {/* Code Preview Box */}
                <div className="relative rounded-xl bg-[#090a0d] border border-white/10 overflow-hidden font-mono text-xs shadow-inner">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#12141a] text-gray-400 text-[11px]">
                    <span>HTML Embed Code</span>
                    <button
                      onClick={handleCopyCode}
                      className="hover:text-white flex items-center gap-1 transition-colors"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <pre className="p-4 text-gray-200 overflow-x-auto leading-relaxed">
                    <code>{iframeSnippet}</code>
                  </pre>
                </div>
              </div>

              {/* Step 3: Instructions Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#1a73e8]/10 to-transparent border border-[#1a73e8]/20 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#1a73e8]/20 text-[#8ab4f8] shrink-0 mt-0.5">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div className="space-y-1 text-xs">
                  <h4 className="font-semibold text-white">How to embed on your website:</h4>
                  <ol className="list-decimal list-inside text-gray-300 space-y-1 pl-1">
                    <li>Download the standalone <code className="text-[#8ab4f8]">{iframeSrc}</code> file using the button above.</li>
                    <li>Upload it to your web server, static host (Vercel/Netlify), or CMS media directory.</li>
                    <li>Paste the copied <code className="text-[#8ab4f8]">&lt;iframe&gt;</code> code into WordPress, Webflow, Squarespace, or your site's HTML!</li>
                  </ol>
                </div>
              </div>
            </>
          ) : (
            /* Live Iframe Preview Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Live Iframe Preview</h3>
                  <p className="text-xs text-gray-400">
                    Test the mini HTML page running inside a genuine browser &lt;iframe&gt;
                  </p>
                </div>

                {/* Device switch buttons */}
                <div className="flex items-center gap-1 bg-[#0b0c0e] p-1 rounded-lg border border-white/10">
                  <button
                    onClick={() => setPreviewDevice("desktop")}
                    className={`p-1.5 rounded transition-colors ${
                      previewDevice === "desktop" ? "bg-[#1a73e8] text-white" : "text-gray-400 hover:text-white"
                    }`}
                    title="Desktop (100%)"
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreviewDevice("tablet")}
                    className={`p-1.5 rounded transition-colors ${
                      previewDevice === "tablet" ? "bg-[#1a73e8] text-white" : "text-gray-400 hover:text-white"
                    }`}
                    title="Tablet (768px)"
                  >
                    <Tablet className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreviewDevice("mobile")}
                    className={`p-1.5 rounded transition-colors ${
                      previewDevice === "mobile" ? "bg-[#1a73e8] text-white" : "text-gray-400 hover:text-white"
                    }`}
                    title="Mobile (390px)"
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Preview Container */}
              <div className="w-full flex justify-center bg-[#07080a] p-4 rounded-xl border border-white/10 overflow-hidden">
                <div
                  className={`transition-all duration-300 w-full rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-black ${previewWidthStyle}`}
                >
                  {standaloneHtml ? (
                    <iframe
                      title="Street Viewer Iframe Preview"
                      srcDoc={standaloneHtml}
                      className="w-full h-full border-0"
                      allow="accelerometer; gyroscope; fullscreen"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                      Generating preview...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/10 bg-[#1a1d24]/80 text-xs">
          <div className="text-gray-400">
            Works in WordPress, Webflow, Notion, Squarespace, Shopify, or plain HTML.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleDownloadHtml}
              className="px-4 py-2 rounded-lg bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium flex items-center gap-2 transition-colors shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download HTML</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

