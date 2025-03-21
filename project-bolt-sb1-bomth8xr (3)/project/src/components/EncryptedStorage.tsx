import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Trash2, Eye, EyeOff, File, Key, FileText, Upload } from 'lucide-react';
import EncryptionManager from '../services/EncryptionManager';

interface SecureItemProps {
  id: string;
  name: string;
  type: 'password' | 'file' | 'note';
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

function SecureItemCard({ id, name, type, onDelete, onView }: SecureItemProps) {
  const Icon = type === 'password' ? Key : type === 'file' ? File : FileText;

  return (
    <div className="bg-black/60 border border-yellow-500/20 rounded-lg p-4 hover:border-yellow-500/40 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Icon className="w-5 h-5 text-yellow-500" />
          <span className="text-yellow-100">{name}</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onView(id)}
            className="p-2 text-yellow-500 hover:text-yellow-400 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(id)}
            className="p-2 text-red-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function EncryptedStorage() {
  const [items, setItems] = useState<Array<Omit<SecureItem, 'data'>>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SecureItem | null>(null);
  const [newItemData, setNewItemData] = useState({
    name: '',
    type: 'password' as const,
    data: '',
    tags: ''
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const encryptionManager = EncryptionManager.getInstance();
      const items = await encryptionManager.listItems();
      setItems(items);
    } catch (error) {
      console.error('Failed to load items:', error);
    }
  };

  const handleAddItem = async () => {
    try {
      const encryptionManager = EncryptionManager.getInstance();
      await encryptionManager.addItem({
        name: newItemData.name,
        type: newItemData.type,
        data: newItemData.data,
        tags: newItemData.tags.split(',').map(tag => tag.trim())
      });
      setShowAddModal(false);
      setNewItemData({ name: '', type: 'password', data: '', tags: '' });
      loadItems();
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const handleViewItem = async (id: string) => {
    try {
      const encryptionManager = EncryptionManager.getInstance();
      const item = await encryptionManager.getItem(id);
      if (item) {
        setSelectedItem(item);
        setShowViewModal(true);
      }
    } catch (error) {
      console.error('Failed to view item:', error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const encryptionManager = EncryptionManager.getInstance();
      await encryptionManager.deleteItem(id);
      loadItems();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      const content = e.target?.result as string;
      setNewItemData({
        name: file.name,
        type: 'file',
        data: content,
        tags: 'file'
      });
    };

    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="min-h-screen bg-black text-white pt-24">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-yellow-500">Secure Storage</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-yellow-500 text-black px-4 py-2 rounded font-semibold hover:bg-yellow-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add New</span>
          </button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-yellow-500/60" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search secure items..."
              className="w-full bg-black/60 border border-yellow-500/20 rounded-lg pl-10 pr-4 py-2 text-yellow-500 focus:outline-none focus:border-yellow-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <SecureItemCard
              key={item.id}
              {...item}
              onDelete={handleDeleteItem}
              onView={handleViewItem}
            />
          ))}
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-black/80 border border-yellow-500/20 rounded-lg p-8 w-full max-w-md">
              <h3 className="text-2xl font-bold text-yellow-500 mb-6">Add New Item</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-yellow-500 mb-2">Name</label>
                  <input
                    type="text"
                    value={newItemData.name}
                    onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                    className="w-full bg-black border border-yellow-500/20 rounded px-4 py-2 text-yellow-500 focus:outline-none focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-yellow-500 mb-2">Type</label>
                  <select
                    value={newItemData.type}
                    onChange={(e) => setNewItemData({ ...newItemData, type: e.target.value as 'password' | 'file' | 'note' })}
                    className="w-full bg-black border border-yellow-500/20 rounded px-4 py-2 text-yellow-500 focus:outline-none focus:border-yellow-500"
                  >
                    <option value="password">Password</option>
                    <option value="file">File</option>
                    <option value="note">Note</option>
                  </select>
                </div>
                <div>
                  <label className="block text-yellow-500 mb-2">Content</label>
                  {newItemData.type === 'file' ? (
                    <div
                      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragging
                          ? 'border-yellow-500 bg-yellow-500/10'
                          : 'border-yellow-500/20 hover:border-yellow-500/40'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileSelect(e.target.files)}
                      />
                      <Upload className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                      <p className="text-yellow-500">
                        {newItemData.data
                          ? 'File selected: ' + newItemData.name
                          : 'Drop a file here or click to browse'}
                      </p>
                    </div>
                  ) : (
                    <textarea
                      value={newItemData.data}
                      onChange={(e) => setNewItemData({ ...newItemData, data: e.target.value })}
                      className="w-full bg-black border border-yellow-500/20 rounded px-4 py-2 text-yellow-500 focus:outline-none focus:border-yellow-500 h-32"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-yellow-500 mb-2">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={newItemData.tags}
                    onChange={(e) => setNewItemData({ ...newItemData, tags: e.target.value })}
                    className="w-full bg-black border border-yellow-500/20 rounded px-4 py-2 text-yellow-500 focus:outline-none focus:border-yellow-500"
                  />
                </div>
              </div>
              <div className="flex space-x-4 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-yellow-500 text-yellow-500 py-2 rounded font-semibold hover:bg-yellow-500/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItem}
                  className="flex-1 bg-yellow-500 text-black py-2 rounded font-semibold hover:bg-yellow-600 transition-colors"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        )}

        {showViewModal && selectedItem && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-black/80 border border-yellow-500/20 rounded-lg p-8 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-yellow-500">{selectedItem.name}</h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-yellow-500 hover:text-yellow-400"
                >
                  <EyeOff className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-black/60 border border-yellow-500/20 rounded p-4">
                {selectedItem.type === 'file' ? (
                  <div className="text-center">
                    <File className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <a
                      href={selectedItem.data}
                      download={selectedItem.name}
                      className="text-yellow-500 hover:text-yellow-400 underline"
                    >
                      Download {selectedItem.name}
                    </a>
                  </div>
                ) : (
                  <pre className="text-yellow-100 whitespace-pre-wrap break-all font-mono">
                    {selectedItem.data}
                  </pre>
                )}
              </div>
              {selectedItem.tags && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedItem.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}