export interface GithubRepositoryDTO {
  id: number;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string;
  description: string | null;
  private: boolean;
}
