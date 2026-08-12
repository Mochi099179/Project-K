import { unified } from "unified";
import remarkParse from "remark-parse";
import { MarkdownBlock } from "./types"
function createBlock(
  node: any,
  markdown: string,
  id: string,
  listMeta?: {
    ordered: boolean;
    number: number | null;
  }
): MarkdownBlock {

  const start =
    node.position?.start;

  const end =
    node.position?.end;

  const startOffset =
    start?.offset ?? null;

  const endOffset =
    end?.offset ?? null;

  const raw =
    startOffset !== null &&
    endOffset !== null
      ? markdown.slice(
          startOffset,
          endOffset
        )
      : "";

  let text =
    extractText(node).trim();


  // -----------------------------------------
  // Restore ordered-list number
  // -----------------------------------------

  if (
    listMeta?.ordered &&
    listMeta.number !== null
  ) {

    text =
      `${listMeta.number}. ${text}`;
  }


  return {

    id,

    type:
      node.type,

    text,

    raw,

    startLine:
      start?.line ?? 0,

    endLine:
      end?.line ?? 0,

    startOffset,

    endOffset,
  };
}

export function parseMarkdown(
  markdown: string
): MarkdownBlock[] {

  const tree = unified()
    .use(remarkParse)
    .parse(markdown);

  const blocks: MarkdownBlock[] = [];

  let id = 0;

  for (const node of tree.children) {

    if (node.type !== "list") {

      id++;

      blocks.push(
        createBlock(
          node,
          markdown,
          `block_${id}`
        )
      );

      continue;
    }

    // List
    const ordered =
      node.ordered === true;

    const listStart =
      node.start ?? 1;

    for (
      let i = 0;
      i < (node.children?.length ?? 0);
      i++
    ) {

      const item =
        node.children[i];

      if (
        item!.type !== "listItem"
      ) {
        continue;
      }

      id++;

      blocks.push(
        createBlock(
          item,
          markdown,
          `block_${id}`,
          {
            ordered,
            number:
              ordered
                ? listStart + i
                : null,
          }
        )
      );
    }
  }

  return blocks;
}

function extractText(
  node: any
): string {

  if (
    node.type === "text" ||
    node.type === "inlineCode"
  ) {
    return node.value ?? "";
  }

  if (node.type === "code") {
    return node.value ?? "";
  }

  if (node.children) {
    return node.children
      .map(extractText)
      .join("");
  }

  return node.value ?? "";
}