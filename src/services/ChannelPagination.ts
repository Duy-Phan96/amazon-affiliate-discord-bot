export interface ChannelChoice {
  id: string;
  name: string;
  category?: string;
  position: number;
}

export interface ChannelChoicePage {
  items: ChannelChoice[];
  page: number;
  totalPages: number;
  totalItems: number;
}

export function paginateChannelChoices(input: ChannelChoice[], requestedPage: number, pageSize = 20): ChannelChoicePage {
  const sorted = [...input].sort((a, b) => a.position - b.position || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(Math.max(0, requestedPage), totalPages - 1);
  return {
    items: sorted.slice(page * pageSize, page * pageSize + pageSize),
    page,
    totalPages,
    totalItems: sorted.length,
  };
}
