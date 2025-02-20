import { replaceJsdocWithTsdoc } from "./src/replace.ts";
import { expandGlob } from "https://deno.land/std@0.116.0/fs/mod.ts";

type Options = {
  updateInPlace: boolean;
  globbingPattern?: string;
  inputFile?: string;
  outputFile?: string;
};

export async function globFilesWithJsdoc(pattern: string) {
  const files: string[] = [];
  for await (const file of expandGlob(pattern)) {
    files.push(file.path);
  }
  return files;
}

async function transformFile(fileIn: string, fileOut: string): Promise<void> {
  await Deno.writeTextFile(
    fileOut,
    replaceJsdocWithTsdoc(await Deno.readTextFile(fileIn), fileIn),
  );
}

function parseOptions(args: string[]) {
  const options: Options = {
    updateInPlace: false,
  };
  let i = 0;
  while (i < args.length) {
    const next = args[i++];
    console.log("N", next);
    switch (next) {
      case "-u":
      case "--update-in-place":
        options.updateInPlace = true;
        continue;

      case "-g":
      case "--glob":
        options.globbingPattern = args[i++];
        if (!options.globbingPattern) {
          throw new Error("Globbing pattern cannot be empty");
        }
        continue;

      case "-i":
      case "--in":
        options.inputFile = args[i++];
        if (!options.inputFile) {
          throw new Error("Input file cannot be empty");
        }
        continue;

      case "-o":
      case "--out":
        options.outputFile = args[i++];
        if (!options.outputFile) {
          throw new Error("Output file cannot be empty");
        }
        continue;

      default:
        if (!options.inputFile) {
          options.inputFile = next;
        } else if (!options.outputFile) {
          options.outputFile = next;
        } else {
          console.log(options);
          throw new Error("Too many arguments");
        }
    }
  }
  return options;
}

async function run(options: Options) {
  if (options.globbingPattern) {
    if (!options.updateInPlace) {
      throw new Error(
        "Globbing only supported with the --update-in-place flag.",
      );
    }
    const files = await globFilesWithJsdoc(options.globbingPattern);
    console.log(`${options.globbingPattern} --> ${files.length} files`);
    await Promise.all(files.map((file) => transformFile(file, file)));
  } else if (options.inputFile) {
    if (options.outputFile) {
      console.log(`${options.inputFile} --> ${options.outputFile}`);
      await transformFile(options.inputFile, options.outputFile);
    } else if (options.updateInPlace) {
      console.log(`${options.inputFile} --> ${options.inputFile}`);
      await transformFile(options.inputFile, options.inputFile);
    } else {
      // to STDOUT?
      throw new Error("You must use --update-in-place if not using --out");
    }
  } else {
    throw new Error("Invalid input, please use either --in or --glob");
  }
  console.log("OK");
}

// Using a module-level await would prevent Deno DNT from building it for NodeJS 😭
// An anonymous self-invoking function will do the trick for either.
(async () => {
  await run(parseOptions(Deno.args));
})();
