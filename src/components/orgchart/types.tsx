export interface OrgNode {
    id: string;
    name: string;
    position: string;
    email: string;
    phone: string;
    children: OrgNode[];
    user_id?: number;
    position_id?: number;
  }
  
  export type OrgNodeFlat = Omit<OrgNode, 'children'> & { parentId: string | null };
  
  export interface AIResponse {
    structure: OrgNode;
  }
  