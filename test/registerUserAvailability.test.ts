import { registerUserAvailability } from '@/utils/format/recfactor/registerUserAvailability';
import { formatUserAvailability } from '@/utils/format/recfactor/formatUserAvailability';
import { createClient } from '@/utils/supabase/server';
import { parseFormdata } from '@/utils/format/voteFormParser';

// モックの設定
jest.mock('@/utils/format/recfactor/formatUserAvailability');
jest.mock('@/utils/supabase/server');
jest.mock('@/utils/format/voteFormParser');

const mockFormatUserAvailability = formatUserAvailability as jest.MockedFunction<typeof formatUserAvailability>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockParseFormdata = parseFormdata as jest.MockedFunction<typeof parseFormdata>;

describe('registerUserAvailability', () => {
  let mockSupabase: any;
  let mockFormData: FormData;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // console.errorをモックして警告を抑制
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Supabaseクライアントのモック
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis()
    };

    mockCreateClient.mockResolvedValue(mockSupabase);

    // FormDataのモック
    mockFormData = new FormData();
    mockFormData.append('eventId', 'test-event-id');

    // デフォルトのモック戻り値を設定
    mockParseFormdata.mockReturnValue({
      votes: {
        date_ids: ['user-123'],
        date_labels: ['2024-07-08', '2024-07-09'],
        time_ids: ['time1', 'time2'],
        time_labels: ['09:00', '10:00'],
        is_available: [[true, false], [false, true]]
      },
      eventId: 'test-event-id'
    });

    mockFormatUserAvailability.mockReturnValue([
      {
        userId: 'user-123',
        startTImeStamp: '2024-07-08T00:00:00.000Z',
        endTimeStamp: '2024-07-09T00:00:00.000Z'
      },
      {
        userId: 'user-123',
        startTImeStamp: '2024-07-09T00:00:00.000Z',
        endTimeStamp: '2024-07-10T00:00:00.000Z'
      }
    ]);

    // データベース操作成功のモック
    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: null })
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('正常にユーザーの利用可能時間を登録する', async () => {
    await registerUserAvailability(mockFormData);

    // フォームデータの解析が呼ばれることを確認
    expect(mockParseFormdata).toHaveBeenCalledWith(mockFormData);

    // formatUserAvailabilityが正しい引数で呼ばれることを確認
    expect(mockFormatUserAvailability).toHaveBeenCalledWith(
      'user-123', // votes.date_ids[0]
      ['2024-07-08', '2024-07-09'], // votes.date_labels
      ['09:00', '10:00'] // votes.time_labels
    );

    // Supabaseクライアントが作成されることを確認
    expect(mockCreateClient).toHaveBeenCalled();

    // データベースへの挿入が正しい形式で行われることを確認
    expect(mockSupabase.from).toHaveBeenCalledWith('user_availability');
    expect(mockSupabase.from().insert).toHaveBeenCalledWith([
      {
        user_id: 'user-123',
        start_timestamp: '2024-07-08T00:00:00.000Z',
        end_timestamp: '2024-07-09T00:00:00.000Z'
      },
      {
        user_id: 'user-123',
        start_timestamp: '2024-07-09T00:00:00.000Z',
        end_timestamp: '2024-07-10T00:00:00.000Z'
      }
    ]);
  });

  test('データが空の場合は挿入処理をスキップする', async () => {
    mockFormatUserAvailability.mockReturnValue([]);

    await registerUserAvailability(mockFormData);

    // フォームデータの解析は呼ばれる
    expect(mockParseFormdata).toHaveBeenCalledWith(mockFormData);
    expect(mockFormatUserAvailability).toHaveBeenCalled();

    // データベースへの挿入は呼ばれない
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  test('データベースエラー時に例外をスローする', async () => {
    const mockError = new Error('Database connection failed');
    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ error: mockError })
    });

    await expect(registerUserAvailability(mockFormData)).rejects.toThrow(
      'ユーザーの利用可能時間の登録に失敗しました'
    );

    // エラーがログに出力されることを確認
    expect(console.error).toHaveBeenCalledWith(
      'Error registering user availability:',
      mockError
    );
  });

  test('複数のユーザー可用性データを正しく処理する', async () => {
    mockFormatUserAvailability.mockReturnValue([
      {
        userId: 'user-123',
        startTImeStamp: '2024-07-08T09:00:00.000Z',
        endTimeStamp: '2024-07-08T10:00:00.000Z'
      },
      {
        userId: 'user-123',
        startTImeStamp: '2024-07-08T10:00:00.000Z',
        endTimeStamp: '2024-07-08T11:00:00.000Z'
      },
      {
        userId: 'user-123',
        startTImeStamp: '2024-07-09T14:00:00.000Z',
        endTimeStamp: '2024-07-09T15:00:00.000Z'
      }
    ]);

    await registerUserAvailability(mockFormData);

    expect(mockSupabase.from().insert).toHaveBeenCalledWith([
      {
        user_id: 'user-123',
        start_timestamp: '2024-07-08T09:00:00.000Z',
        end_timestamp: '2024-07-08T10:00:00.000Z'
      },
      {
        user_id: 'user-123',
        start_timestamp: '2024-07-08T10:00:00.000Z',
        end_timestamp: '2024-07-08T11:00:00.000Z'
      },
      {
        user_id: 'user-123',
        start_timestamp: '2024-07-09T14:00:00.000Z',
        end_timestamp: '2024-07-09T15:00:00.000Z'
      }
    ]);
  });

  test('フォームデータが不正な場合の処理', async () => {
    mockParseFormdata.mockReturnValue({
      votes: {
        date_ids: [], // 空の配列
        date_labels: ['2024-07-08'],
        time_ids: [],
        time_labels: ['09:00'],
        is_available: []
      },
      eventId: 'test-event-id'
    });

    // date_ids[0]が存在しないため、undefinedが渡される
    await registerUserAvailability(mockFormData);

    expect(mockFormatUserAvailability).toHaveBeenCalledWith(
      undefined, // date_ids[0]が存在しない
      ['2024-07-08'],
      ['09:00']
    );
  });
});
