import * as index from './index';

describe('index', () => {
    describe('nameToIdentifier', () => {
        it('should remove quotes', () => {
            const input = "\"hello\"\'world\'";
            const result = index.nameToIdentifier(input);
            expect(result).toBe("helloworld");
        });
        it('should replace non-alphanumeric characters with dashes', () => {
            const input = "hello:world!123";
            const result = index.nameToIdentifier(input);
            expect(result).toBe("hello-world-123");
        });
        it('should replace spaces with hyphens', () => {
            const input = "hello world";
            const result = index.nameToIdentifier(input);
            expect(result).toBe("hello-world");
        });
        it('should replace consecutive dashes with single dash', () => {
            const input = "hello--world---123";
            const result = index.nameToIdentifier(input);
            expect(result).toBe("hello-world-123");
        });
    });
    describe('nameToEnvironmentVariableName', () => {
        const resultPrefix = "GITHUB_PR_LABEL_";
        it('should remove accented characters', () => {
            const input = "çÅÊ";
            const result = index.nameToEnvironmentVariableName(input);
            expect(result).toBe(`${resultPrefix}CAE`);
        });
        it('should should remove quotes', () => {
            const input = "\"hello\"\'world\'";
            const result = index.nameToEnvironmentVariableName(input);
            expect(result).toBe(`${resultPrefix}HELLOWORLD`);
        });
        it('should replace non-alphanumeric characters with underscores', () => {
            const input = "hello:world!123";
            const result = index.nameToEnvironmentVariableName(input);
            expect(result).toBe(`${resultPrefix}HELLO_WORLD_123`);
        });
        it('should replace spaces with underscores', () => {
            const input = "hello world";
            const result = index.nameToEnvironmentVariableName(input);
            expect(result).toBe(`${resultPrefix}HELLO_WORLD`);
        });
        it('should replace consecutive underscores with single underscore', () => {
            const input = "hello__world___123";
            const result = index.nameToEnvironmentVariableName(input);
            expect(result).toBe(`${resultPrefix}HELLO_WORLD_123`);
        });
    });
    
    describe('appendLabelsObject', () => {
        it('should append label object to list', () => {
            const identifier = "sample";
            const labelsObject: {[k: string]: true} = {}
            index.appendLabelsObject(labelsObject, identifier);
            expect(labelsObject[identifier]).toBe(true);
        })
    })
});
