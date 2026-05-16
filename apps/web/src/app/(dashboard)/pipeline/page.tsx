'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCorners,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import Link from 'next/link';
import { apiGet, apiPost } from '@/lib/api';
import { PIPELINE_STAGES, LeadStatus } from '@oneplace/types';
import type { PaginatedResponse } from '@oneplace/types';

interface LeadRow {
  id: string;
  fullName: string;
  phone: string;
  status: LeadStatus;
  score: number;
  assignedTo?: { id: string; name: string } | null;
  course?: { id: string; name: string } | null;
}

export default function PipelinePage() {
  const { data, mutate } = useSWR<PaginatedResponse<LeadRow>>(
    '/leads?pageSize=100&sortBy=updatedAt&sortDir=desc',
    apiGet,
  );

  const grouped = useMemo(() => {
    const g: Record<string, LeadRow[]> = {};
    for (const s of PIPELINE_STAGES) g[s.status] = [];
    if (data?.items)
      for (const l of data.items) {
        if (g[l.status]) g[l.status]!.push(l);
      }
    return g;
  }, [data]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function onDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const leadId = String(e.active.id);
    const newStatus = String(e.over.id) as LeadStatus;
    const lead = data?.items.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;
    // optimistic
    mutate(
      (cur) =>
        cur
          ? {
              ...cur,
              items: cur.items.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)),
            }
          : cur,
      false,
    );
    try {
      await apiPost(`/leads/${leadId}/transition`, { status: newStatus });
    } finally {
      mutate();
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-navy-500">Pipeline</h1>
        <p className="text-sm text-slate-500">Drag a card across columns to move the lead.</p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((s) => (
            <Column key={s.status} status={s.status} title={s.label} color={s.color}>
              {grouped[s.status]?.map((l) => <Card key={l.id} lead={l} />)}
            </Column>
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function Column({
  status,
  title,
  color,
  children,
}: {
  status: LeadStatus;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl border ${
        isOver ? 'border-brand' : 'border-slate-200'
      } bg-slate-50`}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-navy-500">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          {title}
        </div>
      </div>
      <div className="space-y-2 p-2">{children}</div>
    </div>
  );
}

function Card({ lead }: { lead: LeadRow }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`card cursor-grab p-3 active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="text-sm font-semibold text-navy-500">{lead.fullName}</div>
      <div className="text-xs text-slate-500">{lead.phone}</div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-slate-400">{lead.assignedTo?.name ?? 'Unassigned'}</span>
        <Link href={`/leads/${lead.id}`} className="font-semibold text-brand hover:underline">
          Open
        </Link>
      </div>
    </div>
  );
}
