import { Grid } from "@mantine/core";
import type { ReactNode } from "react";
import { Layout } from "../components/Layout";

interface MainLayoutProps {
  sessionBar: ReactNode;
  fileTree: ReactNode;
  inspector: ReactNode;
}

/**
 * Main page layout structure.
 * Render: SessionContainer (top), Grid(FileTree | Inspector) (bottom).
 */
export function MainLayout({ sessionBar, fileTree, inspector }: MainLayoutProps) {
  return (
    <Layout headerActions={sessionBar}>
      <div className="main-content">
        <Grid gutter="xs" p="md" className="inspector-grid">
          <Grid.Col span={{ base: 12, sm: 5 }} className="file-tree-col">
            {fileTree}
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 7 }} className="inspector-col">
            {inspector}
          </Grid.Col>
        </Grid>
      </div>
    </Layout>
  );
}
