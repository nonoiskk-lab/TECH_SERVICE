import PackageEdit from "../[id]/page";

export default function NewPackage() {
  return <PackageEdit params={Promise.resolve({ id: "new" })} searchParams={Promise.resolve({})} />;
}
