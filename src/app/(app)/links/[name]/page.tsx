import { LinkResolverClient } from "./link-resolver-client";

export default async function LinkResolverPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  return <LinkResolverClient name={decodeURIComponent(name)} />;
}
