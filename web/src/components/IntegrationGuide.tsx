import { Fragment } from 'react';
import guide from '../../../INTEGRATION_GUIDE.md?raw';
import { CodeBlock } from './CodeBlock';

// Render our checked-in guide without raw HTML injection or a second copy of its content.
export function IntegrationGuide() {
  const sections = guide.split(/(```[\s\S]*?```)/g);
  return (
    <>
      <a
        href={`data:text/markdown;charset=utf-8,${encodeURIComponent(guide)}`}
        download="slyxup-integration.md"
      >
        Download Markdown for your implementation agent
      </a>
      {sections.map((section) => {
        if (section.startsWith('```')) {
          const newline = section.indexOf('\n');
          return (
            <CodeBlock
              key={section}
              title="Integration example"
              lang={section.slice(3, newline)}
              code={section.slice(newline + 1, -3).trimEnd()}
            />
          );
        }
        return (
          <Fragment key={section}>
            {section
              .split('\n\n')
              .filter(Boolean)
              .map((block) => {
                if (block.startsWith('# '))
                  return <h2 key={block}>{block.slice(2)}</h2>;
                if (block.startsWith('## '))
                  return <h3 key={block}>{block.slice(3)}</h3>;
                if (block.startsWith('### '))
                  return <h4 key={block}>{block.slice(4)}</h4>;
                if (block.startsWith('|')) {
                  const rows = block
                    .split('\n')
                    .filter(
                      (row) => row.startsWith('|') && !/^\|\s*-/.test(row)
                    )
                    .map((row) =>
                      row
                        .split('|')
                        .slice(1, -1)
                        .map((cell) => cell.trim())
                    );
                  return (
                    <div key={block} style={{ overflowX: 'auto' }}>
                      <table>
                        <thead>
                          <tr>
                            {rows[0]?.map((cell) => (
                              <th key={cell} scope="col">
                                {inline(cell)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.slice(1).map((row) => (
                            <tr key={row.join('|')}>
                              {row.map((cell, column) => (
                                <td key={rows[0]?.[column]}>{inline(cell)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }
                if (block.startsWith('- '))
                  return (
                    <ul key={block}>
                      {block.split('\n').map((line) => (
                        <li key={line}>{inline(line.replace(/^- /, ''))}</li>
                      ))}
                    </ul>
                  );
                if (/^\d+\. /.test(block))
                  return (
                    <ol key={block}>
                      {block.split('\n').map((line) => (
                        <li key={line}>
                          {inline(line.replace(/^\d+\. /, ''))}
                        </li>
                      ))}
                    </ol>
                  );
                return <p key={block}>{inline(block)}</p>;
              })}
          </Fragment>
        );
      })}
    </>
  );
}

function inline(text: string) {
  let offset = 0;
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part) => {
    const key = offset;
    offset += part.length;
    if (part.startsWith('`'))
      return (
        <code key={key} className="inline">
          {part.slice(1, -1)}
        </code>
      );
    if (part.startsWith('**'))
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    return part;
  });
}
