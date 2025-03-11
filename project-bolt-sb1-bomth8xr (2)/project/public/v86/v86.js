// V86 loader and initialization helper
window.initV86 = async function() {
  // Check WebAssembly support
  if (typeof WebAssembly !== 'object') {
    throw new Error('WebAssembly is not supported in this browser');
  }

  // Load V86 scripts
  const v86Script = document.createElement('script');
  v86Script.src = 'https://copy.sh/v86/build/libv86.js';
  
  await new Promise((resolve, reject) => {
    v86Script.onload = resolve;
    v86Script.onerror = () => reject(new Error('Failed to load V86 library'));
    document.head.appendChild(v86Script);
  });

  // Verify V86 loaded correctly
  if (typeof V86Starter !== 'function') {
    throw new Error('V86 library failed to initialize properly');
  }

  // Configure WASM path
  V86Starter.prototype.wasm_fn = 'https://copy.sh/v86/build/v86.wasm';

  return true;
}