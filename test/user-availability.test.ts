import { createUserAvailableRangePattern } from '@/app/[id]/register/user-availability';
import { parseFormdata } from '@/utils/format/voteFormParser';
import { processLabels } from '@/utils/format/labelParser';
import { parseTimeLabel, addEndTimesToParsedTimes } from '@/utils/format/judgeLabel';
import { createClient } from '@/utils/supabase/server';

// モックの設定
jest.mock('@/utils/format/voteFormParser');
jest.mock('@/utils/format/labelParser');
jest.mock('@/utils/format/judgeLabel');
jest.mock('@/utils/supabase/server');

const mockParseFormdata = parseFormdata as jest.MockedFunction<typeof parseFormdata>;
const mockProcessLabels = processLabels as jest.MockedFunction<typeof processLabels>;
const mockParseTimeLabel = parseTimeLabel as jest.MockedFunction<typeof parseTimeLabel>;
const mockAddEndTimesToParsedTimes = addEndTimesToParsedTimes as jest.MockedFunction<typeof addEndTimesToParsedTimes>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('user-availability', () => {
  let mockSupabase: any;
  let mockFormData: FormData;

  beforeEach(() => {
    // console.errorをモックして警告を抑制
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Supabaseクライアントのモック
    mockSupabase = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis()
    };

    mockCreateClient.mockResolvedValue(mockSupabase);

    // FormDataのモック
    mockFormData = new FormData();
    mockFormData.append('eventId', 'test-event-id');

    // デフォルトのモック戻り値を設定
    mockParseFormdata.mockReturnValue({
      votes: {
        date_ids: ['date1', 'date2'],
        date_labels: ['2024-07-08', '2024-07-09'],
        time_ids: ['time1', 'time2'],
        time_labels: ['09:00', '10:00'],
        is_available: [[true, false], [false, true]]
      },
      eventId: 'test-event-id'
    });

    mockProcessLabels.mockImplementation(() => ({
      date_labels: ['2024-07-08', '2024-07-09'],
      time_labels: ['09:00-10:00', '10:00-11:00'],
      is_available: [[true, false], [false, true]]
    }));

    mockParseTimeLabel
      .mockReturnValueOnce({ startTime: '09:00', endTime: null, isTimeRecognized: true })
      .mockReturnValueOnce({ startTime: '10:00', endTime: null, isTimeRecognized: true });

    mockAddEndTimesToParsedTimes.mockReturnValue([
      { startTime: '09:00', endTime: '10:00', isTimeRecognized: true },
      { startTime: '10:00', endTime: '11:00', isTimeRecognized: true }
    ]);

    // 認証済みユーザーのモック
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } },
      error: null
    });

    // データベース操作成功のモック
    mockSupabase.from.mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ error: null })
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('createUserAvailableRangePattern', () => {
    test('正常にユーザーの可用性パターンを作成・保存する', async () => {
      const result = await createUserAvailableRangePattern(mockFormData);

      // フォームデータの解析が呼ばれることを確認
      expect(mockParseFormdata).toHaveBeenCalledWith(mockFormData);

      // ラベル処理が呼ばれることを確認
      expect(mockProcessLabels).toHaveBeenCalledWith({
        date_labels: ['2024-07-08', '2024-07-09'],
        time_labels: ['09:00', '10:00'],
        is_available: [[true, false], [false, true]]
      });

      // 時刻解析が呼ばれることを確認
      expect(mockParseTimeLabel).toHaveBeenCalledTimes(2);
      expect(mockAddEndTimesToParsedTimes).toHaveBeenCalled();

      // 認証チェックが呼ばれることを確認
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();

      // データベース保存が呼ばれることを確認
      expect(mockSupabase.from).toHaveBeenCalledWith('user_availability_patterns');

      // 結果の確認
      expect(result.success).toBe(true);
      expect(result.message).toContain('件の可用性パターンを保存しました');
      expect(result.patterns).toHaveLength(2);
      expect(result.patterns[0]).toEqual({ start_time: '09:00', end_time: '10:00' });
      expect(result.patterns[1]).toEqual({ start_time: '10:00', end_time: '11:00' });
    });

    test('認証されていないユーザーの場合エラーを投げる', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      });

      await expect(createUserAvailableRangePattern(mockFormData))
        .rejects.toThrow('User not authenticated');
    });

    test('認証エラーが発生した場合エラーを投げる', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Auth error')
      });

      await expect(createUserAvailableRangePattern(mockFormData))
        .rejects.toThrow('User not authenticated');
    });

    test('利用可能な時間が選択されていない場合の処理', async () => {
      // 全ての時間が利用不可の場合
      mockParseFormdata.mockReturnValue({
        votes: {
          date_ids: ['date1'],
          date_labels: ['2024-07-08'],
          time_ids: ['time1'],
          time_labels: ['09:00'],
          is_available: [[false]]
        },
        eventId: 'test-event-id'
      });

      const result = await createUserAvailableRangePattern(mockFormData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('利用可能な時間が選択されていません');
      expect(result.patterns).toHaveLength(0);

      // データベース操作が呼ばれないことを確認
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    test('重複する時間範囲を除去する', async () => {
      // 同じ時間範囲が複数回選択される場合
      mockParseFormdata.mockReturnValue({
        votes: {
          date_ids: ['date1', 'date2'],
          date_labels: ['2024-07-08', '2024-07-09'],
          time_ids: ['time1'],
          time_labels: ['09:00'],
          is_available: [[true], [true]] // 両日で同じ時間が選択
        },
        eventId: 'test-event-id'
      });

      mockParseTimeLabel.mockReturnValue({ 
        startTime: '09:00', 
        endTime: null, 
        isTimeRecognized: true 
      });

      mockAddEndTimesToParsedTimes.mockReturnValue([
        { startTime: '09:00', endTime: '10:00', isTimeRecognized: true }
      ]);

      const result = await createUserAvailableRangePattern(mockFormData);

      // 重複が除去されて1つのパターンのみになることを確認
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0]).toEqual({ start_time: '09:00', end_time: '10:00' });
    });

    test('認識されない時刻が含まれる場合の処理', async () => {
      mockAddEndTimesToParsedTimes.mockReturnValue([
        { startTime: '09:00', endTime: '10:00', isTimeRecognized: true },
        { startTime: null, endTime: null, isTimeRecognized: false } // 認識失敗
      ]);

      mockParseFormdata.mockReturnValue({
        votes: {
          date_ids: ['date1'],
          date_labels: ['2024-07-08'],
          time_ids: ['time1', 'time2'],
          time_labels: ['09:00', 'invalid'],
          is_available: [[true, true]]
        },
        eventId: 'test-event-id'
      });

      const result = await createUserAvailableRangePattern(mockFormData);

      // 認識できた時刻のみがパターンに含まれることを確認
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0]).toEqual({ start_time: '09:00', end_time: '10:00' });
    });

    test('データベース保存エラーの処理', async () => {
      const dbError = new Error('Database error');
      mockSupabase.from.mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: dbError })
      });

      await expect(createUserAvailableRangePattern(mockFormData))
        .rejects.toThrow('Failed to save availability pattern');
    });

    test('upsert操作の正しいパラメータ設定', async () => {
      const mockUpsert = jest.fn().mockResolvedValue({ error: null });
      mockSupabase.from.mockReturnValue({ upsert: mockUpsert });

      await createUserAvailableRangePattern(mockFormData);

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            user_id: 'test-user-id',
            start_time: expect.any(String),
            end_time: expect.any(String),
            updated_at: expect.any(String)
          })
        ]),
        {
          onConflict: 'user_id,start_time,end_time',
          ignoreDuplicates: false
        }
      );
    });

    test('複数の異なる時間範囲を正しく処理する', async () => {
      mockParseFormdata.mockReturnValue({
        votes: {
          date_ids: ['date1'],
          date_labels: ['2024-07-08'],
          time_ids: ['time1', 'time2', 'time3'],
          time_labels: ['09:00', '14:00', '18:00'],
          is_available: [[true, true, true]]
        },
        eventId: 'test-event-id'
      });

      mockParseTimeLabel
        .mockReturnValueOnce({ startTime: '09:00', endTime: null, isTimeRecognized: true })
        .mockReturnValueOnce({ startTime: '14:00', endTime: null, isTimeRecognized: true })
        .mockReturnValueOnce({ startTime: '18:00', endTime: null, isTimeRecognized: true });

      mockAddEndTimesToParsedTimes.mockReturnValue([
        { startTime: '09:00', endTime: '10:00', isTimeRecognized: true },
        { startTime: '14:00', endTime: '15:00', isTimeRecognized: true },
        { startTime: '18:00', endTime: '19:00', isTimeRecognized: true }
      ]);

      const result = await createUserAvailableRangePattern(mockFormData);

      expect(result.patterns).toHaveLength(3);
      expect(result.patterns).toEqual([
        { start_time: '09:00', end_time: '10:00' },
        { start_time: '14:00', end_time: '15:00' },
        { start_time: '18:00', end_time: '19:00' }
      ]);
    });

    test('日付とイベントIDが正しく処理される', async () => {
      const testEventId = 'specific-event-123';
      mockFormData.set('eventId', testEventId);

      mockParseFormdata.mockReturnValue({
        votes: {
          date_ids: ['date1'],
          date_labels: ['2024-07-08'],
          time_ids: ['time1'],
          time_labels: ['09:00'],
          is_available: [[true]]
        },
        eventId: testEventId
      });

      const result = await createUserAvailableRangePattern(mockFormData);

      expect(mockParseFormdata).toHaveBeenCalledWith(mockFormData);
      expect(result.success).toBe(true);
    });
  });
});
