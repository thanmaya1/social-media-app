/* eslint-env jest */
/* eslint-disable node/no-unpublished-require */
const { start, stop } = require('./util');
const { uploadFile } = require('../utils/cloudinary');
const cloudinary = require('../utils/cloudinary').cloudinary;

beforeAll(async () => {
  await start();
});

afterAll(async () => {
  await stop();
});

describe('cloudinary helper', () => {
  test('uploadFile calls cloudinary.uploader.upload and returns result', async () => {
    // mock uploader.upload
    const spy = jest.spyOn(cloudinary.uploader, 'upload').mockImplementation(async (path, opts) => {
      return {
        secure_url: 'https://example.com/image.jpg',
        resource_type: opts.resource_type || 'auto',
        folder: opts.folder,
      };
    });

    const res = await uploadFile('/tmp/fake.jpg', { folder: 'tests', resource_type: 'image' });
    expect(res).toHaveProperty('secure_url');
    expect(res.folder).toBe('tests');
    spy.mockRestore();
  });
});
