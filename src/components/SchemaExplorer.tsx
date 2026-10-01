import React, { useState } from 'react';
import { Search, Database, Key, ShieldCheck, MapPin, Layers, Copy, Check } from 'lucide-react';
import { TABLES, SCHEMA_DOMAINS } from '../data/schemaDefinition';
import { TableDef } from '../types/architecture';

export const SchemaExplorer: React.FC<{ onOpenDdl: () => void }> = ({ onOpenDdl }) => {
  const [selectedDomain, setSelectedDomain] = useState('All Domains');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState<TableDef>(TABLES[6]); // Default to 'incidents'
  const [copied, setCopied] = useState(false);

  const filteredTables = TABLES.filter((t) => {
    const matchesDomain = selectedDomain === 'All Domains' || t.domain === selectedDomain;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.columns.some((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDomain && matchesSearch;
  });

  const handleCopyTableName = (tableName: string) => {
    navigator.clipboard.writeText(tableName);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search tables, columns, indexes, or spatial types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            {SCHEMA_DOMAINS.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>

          <button
            onClick={onOpenDdl}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-lg text-xs font-mono transition flex items-center space-x-1"
          >
            <Database className="w-3.5 h-3.5" />
            <span>schema.sql</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Table List & Table Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table Sidebar */}
        <div className="lg:col-span-4 space-y-2 max-h-[680px] overflow-y-auto pr-1">
          <div className="text-xs font-semibold uppercase text-slate-400 px-1 mb-2 flex items-center justify-between">
            <span>Tables ({filteredTables.length} of 29)</span>
            <span className="text-[11px] font-mono text-emerald-400">PostgreSQL 16 + PostGIS</span>
          </div>

          {filteredTables.map((t) => {
            const isSelected = selectedTable.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTable(t)}
                className={`w-full text-left p-3 rounded-lg border transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-800 border-emerald-500/80 text-white shadow-sm'
                    : 'bg-slate-900/70 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="font-mono text-xs font-bold text-white">{t.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {t.hasSpatial && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
                        PostGIS
                      </span>
                    )}
                    {t.isAppendOnly && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-400 border border-amber-800">
                        Append-Only
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1 line-clamp-1">{t.purpose}</p>
              </button>
            );
          })}
        </div>

        {/* Selected Table Detail View */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                  {selectedTable.domain}
                </span>
                {selectedTable.hasSpatial && (
                  <span className="text-xs font-mono bg-cyan-950/60 border border-cyan-800 text-cyan-400 px-2 py-0.5 rounded flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span>Spatial PostGIS</span>
                  </span>
                )}
                {selectedTable.isAppendOnly && (
                  <span className="text-xs font-mono bg-amber-950/60 border border-amber-800 text-amber-400 px-2 py-0.5 rounded flex items-center space-x-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Immutable Append-Only</span>
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold font-mono text-white mt-1 flex items-center space-x-2">
                <span>{selectedTable.name}</span>
                <button
                  onClick={() => handleCopyTableName(selectedTable.name)}
                  className="text-slate-500 hover:text-slate-300 transition"
                  title="Copy table name"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </h2>
              <p className="text-sm text-slate-300 mt-1">{selectedTable.purpose}</p>
            </div>
          </div>

          {/* Columns Table */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Table Columns & Data Types ({selectedTable.columns.length})</span>
            </h4>
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
                  <tr>
                    <th className="py-2.5 px-3">Column Name</th>
                    <th className="py-2.5 px-3">Data Type</th>
                    <th className="py-2.5 px-3">Attributes</th>
                    <th className="py-2.5 px-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono">
                  {selectedTable.columns.map((col) => (
                    <tr key={col.name} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 text-emerald-300 font-semibold flex items-center space-x-1.5">
                        {col.isPk && <Key className="w-3 h-3 text-amber-400 shrink-0" />}
                        <span>{col.name}</span>
                      </td>
                      <td className="py-2 px-3 text-cyan-300">
                        {col.isSpatial ? (
                          <span className="text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800">
                            {col.type}
                          </span>
                        ) : (
                          col.type
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {col.isPk && <span className="text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded text-[10px] mr-1">PRIMARY KEY</span>}
                        {col.isFk && (
                          <span className="text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded text-[10px] mr-1" title={col.fkTarget}>
                            FK &rarr; {col.fkTarget}
                          </span>
                        )}
                        {col.isNullable && <span className="text-slate-500 text-[10px]">NULL</span>}
                        {!col.isNullable && !col.isPk && <span className="text-slate-400 text-[10px]">NOT NULL</span>}
                      </td>
                      <td className="py-2 px-3 text-slate-300 font-sans">{col.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Indexes & Constraints */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
              <span className="text-slate-400 font-sans font-semibold uppercase tracking-wider text-[11px] block mb-2">
                Declared Indexes ({selectedTable.indexes.length})
              </span>
              <ul className="space-y-1.5 text-slate-300">
                {selectedTable.indexes.map((idx, i) => (
                  <li key={i} className="flex items-center space-x-1.5">
                    <span className="text-emerald-400">&bull;</span>
                    <span className="text-slate-300">{idx}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
              <span className="text-slate-400 font-sans font-semibold uppercase tracking-wider text-[11px] block mb-2">
                Table Constraints ({selectedTable.constraints.length})
              </span>
              <ul className="space-y-1.5 text-slate-300">
                {selectedTable.constraints.map((c, i) => (
                  <li key={i} className="flex items-center space-x-1.5">
                    <span className="text-amber-400">&bull;</span>
                    <span className="text-slate-300">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
