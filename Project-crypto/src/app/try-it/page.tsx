import { Chapter } from "@/components/chapter";
import { Playground } from "@/components/playground";
import { VerifyAll } from "@/components/verify-all";

export const metadata = { title: "5. Try it · SIMON & SPECK" };

export default function TryItPage() {
  return (
    <Chapter
      href="/try-it"
      takeaway={
        <>
          Everything here runs live in your browser. Pick any of the 20 versions, encrypt, decrypt, and compare with the
          answer printed in the paper.
        </>
      }
    >
      <Playground />
      <VerifyAll />
    </Chapter>
  );
}
